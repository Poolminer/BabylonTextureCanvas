import { Engine } from '@babylonjs/core/Engines/engine';
import { Effect } from '@babylonjs/core/Materials/effect';
import { Material } from '@babylonjs/core/Materials/material';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color4 } from '@babylonjs/core/Maths/math';
import { VertexBuffer } from '@babylonjs/core/Meshes/buffer';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';

Effect.ShadersStore["textureCanvasVertexShader"] = `
// Attributes
attribute vec2 position;

// Output
varying vec2 vPosition;
varying vec2 vUV;

// Uniforms
uniform float rotation;
uniform vec2 pivot;

uniform vec2 vertextTranslation;
uniform vec2 vertexScaling;
uniform vec2 vertexSkewing;

const vec2 madd = vec2(0.5, 0.5);

vec2 rotate(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, -s, s, c);
	return m * v;
}

void main(void) {	
	vPosition = position;
	vUV = position * madd + madd;
	
	gl_Position = vec4((rotate((vec2(position.x + vertexSkewing.x * position.y, position.y + vertexSkewing.y * position.x) * vertexScaling + vertextTranslation - pivot), rotation) + pivot), 0.0, 1.0);
}
`;

Effect.ShadersStore["textureCanvasFragmentShader"] = `
precision highp float;

varying vec2 vUV;

uniform sampler2D diffuseSampler;
uniform sampler2D opacitySampler;
uniform sampler2D backgroundSampler;

uniform vec2 diffuseUVScaling;
uniform vec2 diffuseUVTranslation;

uniform vec2 opacityUVScaling;
uniform vec2 opacityUVTranslation;

void main(void) {
    vec4 backgroundPixel = texture2D(backgroundSampler, vUV);
    vec4 diffusePixel = texture2D(diffuseSampler, vUV * diffuseUVScaling + diffuseUVTranslation);
    vec4 opacityPixel = texture2D(opacitySampler, vUV * opacityUVScaling + opacityUVTranslation);
    gl_FragColor = mix(backgroundPixel, diffusePixel, opacityPixel.a);
}
`;


export interface TextureDrawOptions {
    /** The u-coordinate of this texture at which to draw the diffuse texture, with the origin being the bottom-left corner. */
    du: number,
    /** The v-coordinate of this texture at which to draw the diffuse texture, with the origin being the bottom-left corner. */
    dv: number,
    /** The width to draw the texture at, ranging from 0.0 to 1.0 */
    dWidth: number,
    /** The height to draw the texture at, ranging from 0.0 to 1.0 */
    dHeight: number,

    /** The u-coordinate of the diffuse texture from which to draw it. */
    su: number,
    /** The v-coordinate of the diffuse texture from which to draw it. */
    sv: number,
    /** The width of the region of the diffuse texture to be drawn, ranging from 0.0 to 1.0 */
    sWidth: number,
    /** The height of the region of the diffuse texture to be drawn, ranging from 0.0 to 1.0 */
    sHeight: number,

    /** The rotation in radians to rotate the diffuse textures by. */
    rotation: number,
    /** The u-coordinate of the rotation pivot point. */
    pu: number,
    /** The v-coordinate of the rotation pivot point. */
    pv: number,
    /** Whether the pivot coordinates are in local space (of the diffuse textures) or in world space (of this texture). */
    pIsLocalSpace: boolean,

    /** The horizontal skewing factor. */
    skewU: number,
    /** The vertical skewing factor. */
    skewV: number,

    /** The texture to use as the diffuse texture's alpha channel. */
    opacityTexture?: Texture,
    /** The u-coordinate of the opacity texture from which to draw it. */
    ou: number,
    /** The v-coordinate of the opacity texture from which to draw it. */
    ov: number,
    /** The width of the region of the opacity texture to be drawn, ranging from 0.0 to 1.0 */
    oWidth: number,
    /** The height of the region of the opacity texture to be drawn, ranging from 0.0 to 1.0 */
    oHeight: number
}

export class TextureCanvas extends Texture {
    private _size: number | { width: number, height: number };
    private _vertexBuffers: { [key: string]: Nullable<VertexBuffer> } = {};
    private _indexBuffer: Nullable<WebGLBuffer>;
    private _effect: Effect;
    private _generateMipMaps: boolean;
    private _backBuffer: Texture;
    private _engine: Engine;

    private _textureDrawOptions = TextureCanvas.getDefaultTextureDrawOptions();
    private readonly _defaultTextureDrawOptions = TextureCanvas.getDefaultTextureDrawOptions();

    public clearColor: Color4;

    constructor(size: number | { width: number, height: number }, scene: Nullable<Scene>, onReady?: Function, options: { generateMipMaps?: boolean, samplingMode?: number } = {}) {
        super(null, scene, !options.generateMipMaps, false, options.samplingMode);
        this._engine = scene.getEngine();
        let shaders = { vertex: "textureCanvas", fragment: "textureCanvas" };
        this._effect = this._engine.createEffect(shaders, [VertexBuffer.PositionKind], ['rotation', 'pivot', 'vertextTranslation', 'vertexScaling', 'diffuseUVScaling', 'diffuseUVTranslation', 'opacityUVScaling', 'opacityUVTranslation', 'vertexSkewing'], ['diffuseSampler', 'opacitySampler', 'backgroundSampler']);
        this._size = size;
        this._texture = this._engine.createRenderTargetTexture(size, false);
        this._backBuffer = new Texture(null, scene, !options.generateMipMaps, false, options.samplingMode);
        this._backBuffer._texture = this._engine.createRenderTargetTexture(size, false);

        // VBO
        let vertices = [];
        let v = 1.0;
        vertices.push(v, v);
        vertices.push(-v, v);
        vertices.push(-v, -v);
        vertices.push(v, -v);

        this._vertexBuffers[VertexBuffer.PositionKind] = new VertexBuffer(this._engine, vertices, VertexBuffer.PositionKind, false, false, 2);

        this._createIndexBuffer();

        this.wrapU = 0;
        this.wrapV = 0;

        this.clearColor = new Color4(0.0, 0.0, 0.0, 0.0);
        this._generateMipMaps = options.generateMipMaps;

        this.clear();

        this._effect.executeWhenCompiled(() => {
            if (onReady) {
                onReady(this);
            }
        });
    }

    /**
     * Is the texture ready to be used ? (rendered at least once)
     * @returns true if ready, otherwise, false.
     */
    isReady(): boolean {
        if (!this._effect.isReady()) {
            return false;
        }
        return super.isReady();
    }

    /**
     * Resets the drawing options to their default values.
     */
    resetOptions() {
        this._textureDrawOptions = TextureCanvas.getDefaultTextureDrawOptions();
    }

    /**
     * Sets which area of the diffuse texture to draw.
     * 
     * @param u The u-coordinate from which to draw.
     * @param v The v-coordinate from which to draw.
     * @param width The width of the area to be drawn, ranging from 0.0 to 1.0
     * @param height The height of the area to be drawn, ranging from 0.0 to 1.0
     */
    setDiffuseSamplingRect(u = this._defaultTextureDrawOptions.su, v = this._defaultTextureDrawOptions.sv, width = this._defaultTextureDrawOptions.sWidth, height = this._defaultTextureDrawOptions.sHeight) {
        this._textureDrawOptions.su = u;
        this._textureDrawOptions.sv = v;
        this._textureDrawOptions.sWidth = width;
        this._textureDrawOptions.sHeight = height;
    }

    /**
     * Sets a texture to be used as the diffuse texture's alpha channel.
     * 
     * @param texture The texture to use as the diffuse texture's alpha channel.
     */
    setOpacityTexture(texture: Texture) {
        this._textureDrawOptions.opacityTexture = texture;
    }

    /**
     * Sets which area of the opacity texture to draw.
     * 
     * @param u The u-coordinate from which to draw.
     * @param v The v-coordinate from which to draw.
     * @param width The width of the area to be drawn, ranging from 0.0 to 1.0
     * @param height The height of the area to be drawn, ranging from 0.0 to 1.0
     */
    setOpacitySamplingRect(u = this._defaultTextureDrawOptions.ou, v = this._defaultTextureDrawOptions.ov, width = this._defaultTextureDrawOptions.oWidth, height = this._defaultTextureDrawOptions.oHeight) {
        this._textureDrawOptions.ou = u;
        this._textureDrawOptions.ov = v;
        this._textureDrawOptions.oWidth = width;
        this._textureDrawOptions.oHeight = height;
    }

    /**
     * Sets which area of this texture to draw to — this area may be tranformed by rotating/skewing
     * 
     * @param u The u-coordinate of this texture at which to draw the diffuse texture, with the origin being the bottom-left corner.
     * @param v The v-coordinate of this texture at which to draw the diffuse texture, with the origin being the bottom-left corner.
     * @param width The width to draw the texture at, ranging from 0.0 to 1.0
     * @param height The height to draw the texture at, ranging from 0.0 to 1.0
     */
    setDestinationRect(u = this._defaultTextureDrawOptions.du, v = this._defaultTextureDrawOptions.dv, width = this._defaultTextureDrawOptions.dWidth, height = this._defaultTextureDrawOptions.dHeight) {
        this._textureDrawOptions.du = u;
        this._textureDrawOptions.dv = v;
        this._textureDrawOptions.dWidth = width;
        this._textureDrawOptions.dHeight = height;
    }

    /**
     * Sets the rotation in radians to rotate the diffuse textures by.
     * 
     * @param rotation The rotation in radians to rotate the diffuse textures by.
     */
    setRotation(rotation = this._defaultTextureDrawOptions.rotation) {
        this._textureDrawOptions.rotation = rotation;
    }

    /**
     * Sets the point around which to rotate the texture.
     * 
     * @param pu The u-coordinate of the rotation pivot point.
     * @param pv The v-coordinate of the rotation pivot point.
     * @param isLocalSpace Whether the pivot coordinates are in local space (of the diffuse textures) or in world space (of this texture).
     */
    setPivotPoint(pu = this._defaultTextureDrawOptions.pu, pv = this._defaultTextureDrawOptions.pv, isLocalSpace = this._defaultTextureDrawOptions.pIsLocalSpace) {
        this._textureDrawOptions.pu = pu;
        this._textureDrawOptions.pv = pv;
        this._textureDrawOptions.pIsLocalSpace = isLocalSpace;
    }

    /**
     * Sets how the texture should be skewed (sheared).
     * 
     * @param u The horizontal skewing factor.
     * @param v The vertical skewing factor.
     */
    setSkewing(u = this._defaultTextureDrawOptions.skewU, v = this._textureDrawOptions.skewV) {
        this._textureDrawOptions.skewU = u;
        this._textureDrawOptions.skewV = v;
    }

    /**
     * Draws a texture.
     * 
     * @param diffuseTexture The texture to draw.
     */
    drawTexture(diffuseTexture: Texture, textureDrawOptions = this._textureDrawOptions): void {
        if (this.isReady()) {
            let engine = this._engine;
            let effect = this._effect;
            let gl = engine._gl;
            let p = textureDrawOptions;

            if (!p.opacityTexture) {
                p.opacityTexture = diffuseTexture;
                p.ou = p.du;
                p.ov = p.dv;
                p.oWidth = p.dWidth;
                p.oHeight = p.dHeight;
            }

            let pivotU: number;
            let pivotV: number;

            let vertexTranslationX = p.dWidth - 1 + p.du * 2;
            let vertexTranslationY = p.dHeight - 1 + p.dv * 2;

            if (p.pIsLocalSpace) {
                let _pu = (p.pu * 2 - 1) * p.dWidth;
                let _pv = (p.pv * 2 - 1) * p.dHeight;
                pivotU = _pu + _pv * p.skewU + vertexTranslationX;
                pivotV = _pv + _pu * p.skewV + vertexTranslationY;
            } else {
                pivotU = p.pu * 2 - 1;
                pivotV = p.pv * 2 - 1;
            }

            engine.enableEffect(this._effect);
            engine.setState(false);
            engine.bindFramebuffer(this._backBuffer._texture, 0, undefined, undefined, true);
            engine.bindBuffers(this._vertexBuffers, this._indexBuffer, this._effect);

            effect.setTexture('diffuseSampler', diffuseTexture);
            effect.setTexture('opacitySampler', p.opacityTexture);
            effect.setTexture('backgroundSampler', this);

            effect.setFloat('rotation', p.rotation);
            effect.setFloat2('pivot', pivotU, pivotV);

            effect.setFloat2('vertextTranslation', vertexTranslationX, vertexTranslationY);
            effect.setFloat2('vertexScaling', p.dWidth, p.dHeight);

            effect.setFloat2('diffuseUVScaling', p.sWidth, p.sHeight);
            effect.setFloat2('diffuseUVTranslation', p.su, p.sv);

            effect.setFloat2('opacityUVScaling', p.oWidth, p.oHeight);
            effect.setFloat2('opacityUVTranslation', p.ou, p.ov);

            effect.setFloat2('vertexSkewing', p.skewU, p.skewV);

            // Render to backbuffer
            engine.drawElementsType(Material.TriangleFillMode, 0, 6);

            // Render to self
            engine._bindTextureDirectly(gl.TEXTURE_2D, this._texture, true);
            gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this._texture.width, this._texture.height, 0);

            engine.unBindFramebuffer(this._backBuffer._texture, !this._generateMipMaps);
        }
    }

    /**
     * Clears this texture using the set clearColor
     */
    clear(): void {
        // Backbuffer
        this._engine.bindFramebuffer(this._backBuffer._texture);
        this._engine.clear(this.clearColor, true, false, false);
        this._engine.unBindFramebuffer(this._backBuffer._texture, !this._generateMipMaps);

        // Self
        this._engine.bindFramebuffer(this._texture);
        this._engine.clear(this.clearColor, true, false, false);
        this._engine.unBindFramebuffer(this._texture, !this._generateMipMaps);
    }

    /**
    * Resize the texture to new value.
    * @param size Define the new size the texture should have
    * @param generateMipMaps Define whether the new texture should create mip maps
    */
    public resize(size: number | { width: number, height: number }, generateMipMaps: boolean): void {
        this.releaseInternalTexture();
        this._texture = this._engine.createRenderTargetTexture(size, generateMipMaps);
        this._backBuffer._texture = this._engine.createRenderTargetTexture(size, generateMipMaps);

        // Update properties
        this._size = size;
        this._generateMipMaps = generateMipMaps;
    }

    private _createIndexBuffer(): void {
        let engine = this._engine;

        // Indices
        let indices = [];
        indices.push(0);
        indices.push(1);
        indices.push(2);

        indices.push(0);
        indices.push(2);
        indices.push(3);

        this._indexBuffer = engine.createIndexBuffer(indices);
    }

    /**
    * Clone the texture.
    * @returns the cloned texture
    */
    public clone(): TextureCanvas {
        var canvas = new TextureCanvas(this._size, this.getScene(), (canvas: TextureCanvas) => {
            canvas.drawTexture(this);
        }, { generateMipMaps: this._generateMipMaps, samplingMode: this.samplingMode });
        return canvas;
    }

    /**
     * Dispose the texture and release its asoociated resources.
     */
    public dispose(): void {
        let scene = this.getScene();

        if (!scene) {
            return;
        }

        var vertexBuffer = this._vertexBuffers[VertexBuffer.PositionKind];
        if (vertexBuffer) {
            vertexBuffer.dispose();
            this._vertexBuffers[VertexBuffer.PositionKind] = null;
        }

        if (this._indexBuffer && this._engine._releaseBuffer(this._indexBuffer)) {
            this._indexBuffer = null;
        }

        super.dispose();
    }

    public static getDefaultTextureDrawOptions(): TextureDrawOptions {
        return {
            /* Destination */
            du: 0,
            dv: 0,
            dWidth: 1,
            dHeight: 1,
            rotation: 0,

            /* Source */
            su: 0,
            sv: 0,
            sWidth: 1,
            sHeight: 1,

            /* Pivot */
            pu: 0.5,
            pv: 0.5,
            pIsLocalSpace: true,

            /* Skewing (shearing) */
            skewU: 0,
            skewV: 0,

            /* Opacity */
            ou: 0,
            ov: 0,
            oWidth: 0,
            oHeight: 0
        }
    }
}