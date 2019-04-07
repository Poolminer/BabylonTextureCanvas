"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
BABYLON.Effect.ShadersStore["textureCanvasVertexShader"] = "\n// Attributes\nattribute vec2 position;\n\n// Output\nvarying vec2 vPosition;\nvarying vec2 vUV;\n\n// Uniforms\nuniform float rotation;\nuniform vec2 translation;\nuniform vec2 scaling;\nuniform vec2 pivot;\n\nconst vec2 madd = vec2(0.5, 0.5);\n\nvec2 rotate(vec2 v, float a) {\n\tfloat s = sin(a);\n\tfloat c = cos(a);\n\tmat2 m = mat2(c, -s, s, c);\n\treturn m * v;\n}\n\nvoid main(void) {\t\n\tvPosition = position;\n\tvUV = position * madd + madd;\n\t\n\tgl_Position = vec4(rotate((position - pivot) * scaling, rotation) + pivot * scaling, 0.0, 1.0) + vec4(translation, 0.0, 0.0);\n}\n";
BABYLON.Effect.ShadersStore["textureCanvasFragmentShader"] = "\nprecision highp float;\n\nvarying vec2 vUV;\n\nuniform sampler2D textureSampler;\nuniform sampler2D backgroundSampler;\n\nvoid main(void) {\n    vec4 backgroundPixel = texture2D(backgroundSampler, vUV);\n    vec4 texturePixel = texture2D(textureSampler, vUV);\n    gl_FragColor = mix(backgroundPixel, texturePixel, texturePixel.a);\n}\n";
var material_1 = require("@babylonjs/core/Materials/material");
var texture_1 = require("@babylonjs/core/Materials/Textures/texture");
var math_1 = require("@babylonjs/core/Maths/math");
var buffer_1 = require("@babylonjs/core/Meshes/buffer");
var TextureCanvas = /** @class */ (function (_super) {
    __extends(TextureCanvas, _super);
    function TextureCanvas(size, scene, onReady, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, null, scene, !options.generateMipMaps, false, options.samplingMode) || this;
        _this._vertexBuffers = {};
        _this._rotationZ = math_1.Matrix.Identity();
        _this._engine = scene.getEngine();
        var shaders = { vertex: "textureCanvas", fragment: "textureCanvas" };
        _this._effect = _this._engine.createEffect(shaders, [buffer_1.VertexBuffer.PositionKind], ['rotation', 'translation', 'scaling', 'pivot'], ['textureSampler', 'backgroundSampler']);
        _this._size = size;
        _this._texture = _this._engine.createRenderTargetTexture(size, false);
        _this._backBuffer = new texture_1.Texture(null, scene, !options.generateMipMaps, false, options.samplingMode);
        _this._backBuffer._texture = _this._engine.createRenderTargetTexture(size, false);
        // VBO
        var vertices = [];
        var v = 1.0;
        vertices.push(v, v);
        vertices.push(-v, v);
        vertices.push(-v, -v);
        vertices.push(v, -v);
        _this._vertexBuffers[buffer_1.VertexBuffer.PositionKind] = new buffer_1.VertexBuffer(_this._engine, vertices, buffer_1.VertexBuffer.PositionKind, false, false, 2);
        _this._createIndexBuffer();
        _this.wrapU = 0;
        _this.wrapV = 0;
        _this.clearColor = new math_1.Color4(0.0, 0.0, 0.0, 0.0);
        _this._generateMipMaps = options.generateMipMaps;
        _this.clear();
        _this._effect.executeWhenCompiled(function () {
            if (onReady) {
                onReady(_this);
            }
        });
        return _this;
    }
    /**
     * Is the texture ready to be used ? (rendered at least once)
     * @returns true if ready, otherwise, false.
     */
    TextureCanvas.prototype.isReady = function () {
        if (!this._effect.isReady()) {
            return false;
        }
        return _super.prototype.isReady.call(this);
    };
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
    TextureCanvas.prototype.drawTexture = function (texture, du, dv, dWidth, dHeight, rotation, pivotU, pivotV) {
        if (du === void 0) { du = 0; }
        if (dv === void 0) { dv = 0; }
        if (dWidth === void 0) { dWidth = 1; }
        if (dHeight === void 0) { dHeight = 1; }
        if (rotation === void 0) { rotation = 0.0; }
        if (pivotU === void 0) { pivotU = 0.5; }
        if (pivotV === void 0) { pivotV = 0.5; }
        if (this.isReady()) {
            var engine = this._engine;
            var effect = this._effect;
            var gl = engine._gl;
            math_1.Matrix.RotationZToRef(rotation, this._rotationZ);
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
            engine.drawElementsType(material_1.Material.TriangleFillMode, 0, 6);
            // Render to self
            engine._bindTextureDirectly(gl.TEXTURE_2D, this._texture, true);
            gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this._texture.width, this._texture.height, 0);
            engine.unBindFramebuffer(this._backBuffer._texture, false);
        }
    };
    /**
     * Clears this texture using the set clearColor
     */
    TextureCanvas.prototype.clear = function () {
        this._engine.bindFramebuffer(this._backBuffer._texture, 0, undefined, undefined, true);
        this._engine.clear(this.clearColor, true, false, false);
        this._engine.unBindFramebuffer(this._backBuffer._texture, false);
    };
    /**
    * Resize the texture to new value.
    * @param size Define the new size the texture should have
    * @param generateMipMaps Define whether the new texture should create mip maps
    */
    TextureCanvas.prototype.resize = function (size, generateMipMaps) {
        this.releaseInternalTexture();
        this._texture = this._engine.createRenderTargetTexture(size, generateMipMaps);
        this._backBuffer._texture = this._engine.createRenderTargetTexture(size, generateMipMaps);
        // Update properties
        this._size = size;
        this._generateMipMaps = generateMipMaps;
    };
    TextureCanvas.prototype._createIndexBuffer = function () {
        var engine = this._engine;
        // Indices
        var indices = [];
        indices.push(0);
        indices.push(1);
        indices.push(2);
        indices.push(0);
        indices.push(2);
        indices.push(3);
        this._indexBuffer = engine.createIndexBuffer(indices);
    };
    /**
    * Clone the texture.
    * @returns the cloned texture
    */
    TextureCanvas.prototype.clone = function () {
        var _this = this;
        var canvas = new TextureCanvas(this._size, this.getScene(), function (canvas) {
            canvas.drawTexture(_this);
        }, { generateMipMaps: this._generateMipMaps, samplingMode: this.samplingMode });
        return canvas;
    };
    /**
     * Dispose the texture and release its asoociated resources.
     */
    TextureCanvas.prototype.dispose = function () {
        var scene = this.getScene();
        if (!scene) {
            return;
        }
        var vertexBuffer = this._vertexBuffers[buffer_1.VertexBuffer.PositionKind];
        if (vertexBuffer) {
            vertexBuffer.dispose();
            this._vertexBuffers[buffer_1.VertexBuffer.PositionKind] = null;
        }
        if (this._indexBuffer && this._engine._releaseBuffer(this._indexBuffer)) {
            this._indexBuffer = null;
        }
        _super.prototype.dispose.call(this);
    };
    return TextureCanvas;
}(texture_1.Texture));
exports.TextureCanvas = TextureCanvas;
