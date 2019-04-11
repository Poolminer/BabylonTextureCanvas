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

export class TextureCanvasDrawContext {
    protected static readonly DEFAULT_TEXTURE_DRAW_OPTIONS: TextureCanvasDrawContext = new TextureCanvasDrawContext();

    protected _defaultTextureDrawOptions = TextureCanvasDrawContext.DEFAULT_TEXTURE_DRAW_OPTIONS;

    /** The texture to draw. */
    public diffuseTexture: Texture;
    /** The u-coordinate of this texture at which to draw the diffuse texture; with the origin being the bottom-left corner. */
    public du: number = 0;
    /** The v-coordinate of this texture at which to draw the diffuse texture; with the origin being the bottom-left corner. */
    public dv: number = 0;
    /** The width to draw the texture at; ranging from 0.0 to 1.0 */
    public dWidth: number = 1;
    /** The height to draw the texture at; ranging from 0.0 to 1.0 */
    public dHeight: number = 1;

    /** The u-coordinate of the diffuse texture from which to draw it. */
    public su: number = 0;
    /** The v-coordinate of the diffuse texture from which to draw it. */
    public sv: number = 0;
    /** The width of the region of the diffuse texture to be drawn; ranging from 0.0 to 1.0 */
    public sWidth: number = 1;
    /** The height of the region of the diffuse texture to be drawn; ranging from 0.0 to 1.0 */
    public sHeight: number = 1;

    /** The rotation in radians to rotate the diffuse textures by. */
    public rotation: number = 0;
    /** The u-coordinate of the rotation pivot point. */
    public pu: number = 0.5;
    /** The v-coordinate of the rotation pivot point. */
    public pv: number = 0.5;
    /** Whether the pivot coordinates are in local space (of the diffuse textures) or in world space (of the canvas). */
    public pIsLocalSpace: boolean = true;

    /** The horizontal skewing factor. */
    public skewU: number = 0;
    /** The vertical skewing factor. */
    public skewV: number = 0;

    /** The texture to use as the diffuse texture's alpha channel. */
    public opacityTexture: Texture;
    /** The u-coordinate of the opacity texture from which to draw it. */
    public ou: number = 0;
    /** The v-coordinate of the opacity texture from which to draw it. */
    public ov: number = 0;
    /** The width of the region of the opacity texture to be drawn; ranging from 0.0 to 1.0 */
    public oWidth: number = 1;
    /** The height of the region of the opacity texture to be drawn; ranging from 0.0 to 1.0 */
    public oHeight: number = 1;

    /** The color to clear the canvas with. */
    public clearColor: Color4 = new Color4(0.0, 0.0, 0.0, 0.0);

    constructor(public textureCanvas?: TextureCanvas) {
    }

    /**
     * Resets the draw options to their default values.
     */
    reset(): void {
        this._defaultTextureDrawOptions.clone(true, this);
    }

    /**
     * Sets the texture to draw.
     * 
     * @param texture The texture to draw.
     */
    setDiffuseTexture(texture: Texture): void {
        this.diffuseTexture = texture;
    }

    /**
     * Sets a texture to be used as the diffuse texture's alpha channel.
     * 
     * @param texture The texture to use as the diffuse texture's alpha channel.
     */
    setOpacityTexture(texture: Texture): void {
        this.opacityTexture = texture;
    }

    /**
     * Sets which area of the diffuse texture to draw.
     * 
     * @param u The u-coordinate from which to draw.
     * @param v The v-coordinate from which to draw.
     * @param width The width of the area to be drawn, ranging from 0.0 to 1.0
     * @param height The height of the area to be drawn, ranging from 0.0 to 1.0
     */
    setDiffuseSamplingRect(u = this._defaultTextureDrawOptions.su, v = this._defaultTextureDrawOptions.sv, width = this._defaultTextureDrawOptions.sWidth, height = this._defaultTextureDrawOptions.sHeight): void {
        this.su = u;
        this.sv = v;
        this.sWidth = width;
        this.sHeight = height;
    }

    /**
     * Sets which area of the opacity texture to draw.
     * 
     * @param u The u-coordinate from which to draw.
     * @param v The v-coordinate from which to draw.
     * @param width The width of the area to be drawn, ranging from 0.0 to 1.0
     * @param height The height of the area to be drawn, ranging from 0.0 to 1.0
     */
    setOpacitySamplingRect(u = this._defaultTextureDrawOptions.ou, v = this._defaultTextureDrawOptions.ov, width = this._defaultTextureDrawOptions.oWidth, height = this._defaultTextureDrawOptions.oHeight): void {
        this.ou = u;
        this.ov = v;
        this.oWidth = width;
        this.oHeight = height;
    }

    /**
     * Sets which area of this texture to draw to — this area may be tranformed by rotating/skewing.
     * 
     * @param u The u-coordinate of this texture at which to draw the diffuse texture, with the origin being the bottom-left corner.
     * @param v The v-coordinate of this texture at which to draw the diffuse texture, with the origin being the bottom-left corner.
     * @param width The width to draw the texture at, ranging from 0.0 to 1.0
     * @param height The height to draw the texture at, ranging from 0.0 to 1.0
     */
    setDrawRect(u = this._defaultTextureDrawOptions.du, v = this._defaultTextureDrawOptions.dv, width = this._defaultTextureDrawOptions.dWidth, height = this._defaultTextureDrawOptions.dHeight): void {
        this.du = u;
        this.dv = v;
        this.dWidth = width;
        this.dHeight = height;
    }

    /**
     * Sets the rotation in radians to rotate the diffuse texture by.
     * 
     * @param rotation The rotation in radians to rotate the diffuse textures by.
     */
    setRotation(rotation = this._defaultTextureDrawOptions.rotation): void {
        this.rotation = rotation;
    }

    /**
     * Sets the point around which to rotate the texture.
     * 
     * @param pu The u-coordinate of the rotation pivot point.
     * @param pv The v-coordinate of the rotation pivot point.
     * @param isLocalSpace Whether the pivot coordinates are in local space (of the diffuse textures) or in world space (of this texture).
     */
    setPivotPoint(pu = this._defaultTextureDrawOptions.pu, pv = this._defaultTextureDrawOptions.pv, isLocalSpace = this._defaultTextureDrawOptions.pIsLocalSpace): void {
        this.pu = pu;
        this.pv = pv;
        this.pIsLocalSpace = isLocalSpace;
    }

    /**
     * Sets how the texture should be skewed (shear transform).
     * 
     * @param u The horizontal skewing factor.
     * @param v The vertical skewing factor.
     */
    setSkewing(u = this._defaultTextureDrawOptions.skewU, v = this._defaultTextureDrawOptions.skewV): void {
        this.skewU = u;
        this.skewV = v;
    }

    /**
     * Draws the diffuse texture, if set.
     */
    draw(): void {
        this.textureCanvas.draw(this);
    }

    /**
     * Draws a texture.
     * 
     * @param diffuseTexture The texture to draw.
     */
    drawTexture(diffuseTexture: Texture) {
        this.textureCanvas.drawTexture(diffuseTexture, this);
    }

    /**
     * Clears the canvas using the set clearColor.
     */
    clear(): void {
        this.textureCanvas.clear(this);
    }

    /**
     * Returns a clone of this context.
     * 
     * @param deep Wether to clone the member objects.
     * @param ref The context to clone into.
     */
    clone(deep = false, ref?: TextureCanvasDrawContext): TextureCanvasDrawContext {
        if (!ref) {
            ref = new TextureCanvasDrawContext(this.textureCanvas);
        }
        ref.diffuseTexture = (deep && this.diffuseTexture) ? this.diffuseTexture.clone() : this.diffuseTexture;
        ref.du = this.du;
        ref.dv = this.dv;
        ref.dWidth = this.dWidth;
        ref.dHeight = this.dHeight;

        ref.su = this.su;
        ref.sv = this.sv;
        ref.sWidth = this.sWidth;
        ref.sHeight = this.sHeight;

        ref.rotation = this.rotation;
        ref.pu = this.pu;
        ref.pv = this.pv;
        ref.pIsLocalSpace = this.pIsLocalSpace;

        ref.skewU = this.skewU;
        ref.skewV = this.skewV;

        ref.opacityTexture = (deep && this.opacityTexture) ? this.opacityTexture.clone() : this.opacityTexture;
        ref.ou = this.ou;
        ref.ov = this.ov;
        ref.oWidth = this.oWidth;
        ref.oHeight = this.oHeight;

        ref.clearColor = deep ? this.clearColor.clone() : this.clearColor;

        return ref;
    }
}

export class TextureCanvas extends Texture {
    private _size: number | { width: number, height: number };
    private _vertexBuffers: { [key: string]: Nullable<VertexBuffer> } = {};
    private _indexBuffer: Nullable<WebGLBuffer>;
    private _effect: Effect;
    private _generateMipMaps: boolean;
    private _backBuffer: Texture;
    private _engine: Engine;

    private _previousDrawInfo: { wasReady: boolean, diffuseTexture: Texture, drawContext: TextureCanvasDrawContext };
    private _defaultDrawContext = new TextureCanvasDrawContext(this);

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
     * 
     * @returns true if ready, otherwise, false.
     */
    isReady(): boolean {
        if (!this._effect.isReady()) {
            return false;
        }
        return super.isReady();
    }

    /**
     * Draws the diffuse texture, if set.
     * 
     * @param ctx The texture draw options.
     */
    draw(ctx: TextureCanvasDrawContext = this._defaultDrawContext) {
        if (ctx.diffuseTexture) {
            this.drawTexture(ctx.diffuseTexture, ctx);
        }
    }

    /**
     * Draws a texture.
     * 
     * @param diffuseTexture The texture to draw.
     * @param ctx The texture draw context.
     */
    drawTexture(diffuseTexture: Texture, ctx: TextureCanvasDrawContext = this._defaultDrawContext): void {
        let isReady = this.isReady();
        if (isReady) {
            let engine = this._engine;
            let effect = this._effect;
            let gl = engine._gl;

            let pivotU: number;
            let pivotV: number;

            let vertexTranslationX = ctx.dWidth - 1 + ctx.du * 2;
            let vertexTranslationY = ctx.dHeight - 1 + ctx.dv * 2;

            if (ctx.pIsLocalSpace) {
                let _pu = (ctx.pu * 2 - 1) * ctx.dWidth;
                let _pv = (ctx.pv * 2 - 1) * ctx.dHeight;
                pivotU = _pu + _pv * ctx.skewU + vertexTranslationX;
                pivotV = _pv + _pu * ctx.skewV + vertexTranslationY;
            } else {
                pivotU = ctx.pu * 2 - 1;
                pivotV = ctx.pv * 2 - 1;
            }

            engine.enableEffect(this._effect);
            engine.setState(false);
            engine.bindFramebuffer(this._backBuffer._texture, 0, undefined, undefined, true);
            engine.bindBuffers(this._vertexBuffers, this._indexBuffer, this._effect);

            effect.setTexture('diffuseSampler', diffuseTexture);
            effect.setTexture('backgroundSampler', this);

            effect.setFloat('rotation', ctx.rotation);
            effect.setFloat2('pivot', pivotU, pivotV);

            effect.setFloat2('vertextTranslation', vertexTranslationX, vertexTranslationY);
            effect.setFloat2('vertexScaling', ctx.dWidth, ctx.dHeight);

            effect.setFloat2('diffuseUVScaling', ctx.sWidth, ctx.sHeight);
            effect.setFloat2('diffuseUVTranslation', ctx.su, ctx.sv);

            if (ctx.opacityTexture) {
                effect.setTexture('opacitySampler', ctx.opacityTexture);
                effect.setFloat2('opacityUVScaling', ctx.oWidth, ctx.oHeight);
                effect.setFloat2('opacityUVTranslation', ctx.ou, ctx.ov);
            } else {
                effect.setTexture('opacitySampler', diffuseTexture);
                effect.setFloat2('opacityUVScaling', ctx.dWidth, ctx.dHeight);
                effect.setFloat2('opacityUVTranslation', ctx.du, ctx.dv);
            }

            effect.setFloat2('vertexSkewing', ctx.skewU, ctx.skewV);

            // Render to backbuffer
            engine.drawElementsType(Material.TriangleFillMode, 0, 6);

            // Render to self
            engine._bindTextureDirectly(gl.TEXTURE_2D, this._texture, true);
            gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this._texture.width, this._texture.height, 0);

            engine.unBindFramebuffer(this._backBuffer._texture, !this._generateMipMaps);
        }
        this._previousDrawInfo = {
            wasReady: isReady,
            diffuseTexture: diffuseTexture,
            drawContext: ctx
        };
    }

    /**
     * Clears this texture using clearColor from the provided context.
     */
    clear(ctx: TextureCanvasDrawContext = this._defaultDrawContext): void {
        // Backbuffer
        this._engine.bindFramebuffer(this._backBuffer._texture);
        this._engine.clear(ctx.clearColor, true, false, false);
        this._engine.unBindFramebuffer(this._backBuffer._texture, !this._generateMipMaps);

        // Self
        this._engine.bindFramebuffer(this._texture);
        this._engine.clear(ctx.clearColor, true, false, false);
        this._engine.unBindFramebuffer(this._texture, !this._generateMipMaps);
    }

    /**
    * Resize the texture to new value.
    * 
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

    /**
     * Creates a new draw context. Does NOT invalidate other contexts created.
     */
    public createContext() {
        return new TextureCanvasDrawContext(this);
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
            if (this._previousDrawInfo && this._previousDrawInfo.wasReady) {
                canvas.drawTexture(this._previousDrawInfo.diffuseTexture, this._previousDrawInfo.drawContext);
            }
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
}