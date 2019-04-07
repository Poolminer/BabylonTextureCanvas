BABYLON.Effect.ShadersStore["textureCanvasVertexShader"] = `
// Attributes
attribute vec2 position;

// Output
varying vec2 vPosition;
varying vec2 vUV;

// Uniforms
uniform float rotation;
uniform vec2 translation;
uniform vec2 scaling;
uniform vec2 pivot;

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
	
	gl_Position = vec4(rotate((position - pivot) * scaling, rotation) + pivot * scaling, 0.0, 1.0) + vec4(translation, 0.0, 0.0);
}
`;

BABYLON.Effect.ShadersStore["textureCanvasFragmentShader"] = `
precision highp float;

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform sampler2D backgroundSampler;

void main(void) {
    vec4 backgroundPixel = texture2D(backgroundSampler, vUV);
    vec4 texturePixel = texture2D(textureSampler, vUV);
    gl_FragColor = mix(backgroundPixel, texturePixel, texturePixel.a);
}
`;

import { Engine } from '@babylonjs/core/Engines/engine';
import { Effect } from '@babylonjs/core/Materials/effect';
import { Material } from '@babylonjs/core/Materials/material';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Color4, Matrix } from '@babylonjs/core/Maths/math';
import { VertexBuffer } from '@babylonjs/core/Meshes/buffer';
import { Scene } from '@babylonjs/core/scene';
import { Nullable } from '@babylonjs/core/types';

export class TextureCanvas extends Texture {
    private _size: number | { width: number, height: number };
    private _vertexBuffers: { [key: string]: Nullable<VertexBuffer> } = {};
    private _indexBuffer: Nullable<WebGLBuffer>;
    private _effect: Effect;
    private _generateMipMaps: boolean;
    private _backBuffer: Texture;
    private _rotationZ = Matrix.Identity();

    private _engine: Engine;
    public clearColor: Color4;

    constructor(size: number | { width: number, height: number }, scene: Nullable<Scene>, onReady?: Function, options: { generateMipMaps?: boolean, samplingMode?: number } = {}) {
        super(null, scene, !options.generateMipMaps, false, options.samplingMode);
        this._engine = scene.getEngine();
        let shaders = { vertex: "textureCanvas", fragment: "textureCanvas" };
        this._effect = this._engine.createEffect(shaders, [VertexBuffer.PositionKind], ['rotation', 'translation', 'scaling', 'pivot'], ['textureSampler', 'backgroundSampler']);
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
     * Draws a texture.
     * 
     * @param texture The texture to draw.
     * @param du The u-coordinate at which to draw the texture, with the origin being the bottom-left corner.
     * @param dv The v-coordinate at which to draw the texture, with the origin being the bottom-left corner.
     * @param dWidth The width to draw the texture at, ranging from 0.0 to 1.0
     * @param dHeight The height to draw the texture at, ranging from 0.0 to 1.0
     * @param rotation The angle in radians to rotate the texure by.
     * @param pivotU The u-coordinate of the rotation pivot in the source texture.
     * @param pivotV The v-coordinate of the rotation pivot in the source texture.
     */
    drawTexture(texture: Texture, du: number = 0, dv: number = 0, dWidth: number = 1, dHeight: number = 1, rotation: number = 0.0, pivotU = 0.5, pivotV = 0.5): void {
        if (this.isReady()) {
            let engine = this._engine;
            let effect = this._effect;
            let gl = engine._gl;

            Matrix.RotationZToRef(rotation, this._rotationZ);

            engine.enableEffect(this._effect);
            engine.setState(false);
            engine.bindFramebuffer(this._backBuffer._texture, 0, undefined, undefined, true);
            engine.bindBuffers(this._vertexBuffers, this._indexBuffer, this._effect);

            effect.setTexture('textureSampler', texture);
            effect.setTexture('backgroundSampler', this);
            effect.setFloat('rotation', rotation);
            effect.setFloat2('translation', dWidth - 1 + du * 2, dHeight - 1 + dv * 2);
            effect.setFloat2('scaling', dWidth, dHeight);
            effect.setFloat2('pivot', pivotU * 2 - 1, pivotV * 2 - 1);

            // Render to backbuffer
            engine.drawElementsType(Material.TriangleFillMode, 0, 6);

            // Render to self
            engine._bindTextureDirectly(gl.TEXTURE_2D, this._texture, true);
            gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this._texture.width, this._texture.height, 0);

            engine.unBindFramebuffer(this._backBuffer._texture, false);
        }
    }

    /**
     * Clears this texture using the set clearColor
     */
    clear(): void {
        this._engine.bindFramebuffer(this._backBuffer._texture, 0, undefined, undefined, true);
        this._engine.clear(this.clearColor, true, false, false);
        this._engine.unBindFramebuffer(this._backBuffer._texture, false);
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
}