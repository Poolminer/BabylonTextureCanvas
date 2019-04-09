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
var effect_1 = require("@babylonjs/core/Materials/effect");
var material_1 = require("@babylonjs/core/Materials/material");
var texture_1 = require("@babylonjs/core/Materials/Textures/texture");
var math_1 = require("@babylonjs/core/Maths/math");
var buffer_1 = require("@babylonjs/core/Meshes/buffer");
effect_1.Effect.ShadersStore["textureCanvasVertexShader"] = "\n// Attributes\nattribute vec2 position;\n\n// Output\nvarying vec2 vPosition;\nvarying vec2 vUV;\n\n// Uniforms\nuniform float rotation;\nuniform vec2 pivot;\n\nuniform vec2 vertextTranslation;\nuniform vec2 vertexScaling;\nuniform vec2 vertexSkewing;\n\nconst vec2 madd = vec2(0.5, 0.5);\n\nvec2 rotate(vec2 v, float a) {\n\tfloat s = sin(a);\n\tfloat c = cos(a);\n\tmat2 m = mat2(c, -s, s, c);\n\treturn m * v;\n}\n\nvoid main(void) {\t\n\tvPosition = position;\n\tvUV = position * madd + madd;\n\t\n\tgl_Position = vec4((rotate((vec2(position.x + vertexSkewing.x * position.y, position.y + vertexSkewing.y * position.x) * vertexScaling + vertextTranslation - pivot), rotation) + pivot), 0.0, 1.0);\n}\n";
effect_1.Effect.ShadersStore["textureCanvasFragmentShader"] = "\nprecision highp float;\n\nvarying vec2 vUV;\n\nuniform sampler2D diffuseSampler;\nuniform sampler2D opacitySampler;\nuniform sampler2D backgroundSampler;\n\nuniform vec2 diffuseUVScaling;\nuniform vec2 diffuseUVTranslation;\n\nuniform vec2 opacityUVScaling;\nuniform vec2 opacityUVTranslation;\n\nvoid main(void) {\n    vec4 backgroundPixel = texture2D(backgroundSampler, vUV);\n    vec4 diffusePixel = texture2D(diffuseSampler, vUV * diffuseUVScaling + diffuseUVTranslation);\n    vec4 opacityPixel = texture2D(opacitySampler, vUV * opacityUVScaling + opacityUVTranslation);\n    gl_FragColor = mix(backgroundPixel, diffusePixel, opacityPixel.a);\n}\n";
var TextureCanvas = /** @class */ (function (_super) {
    __extends(TextureCanvas, _super);
    function TextureCanvas(size, scene, onReady, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, null, scene, !options.generateMipMaps, false, options.samplingMode) || this;
        _this._vertexBuffers = {};
        _this._textureDrawOptions = TextureCanvas.getDefaultTextureDrawOptions();
        _this._defaultTextureDrawOptions = TextureCanvas.getDefaultTextureDrawOptions();
        _this._engine = scene.getEngine();
        var shaders = { vertex: "textureCanvas", fragment: "textureCanvas" };
        _this._effect = _this._engine.createEffect(shaders, [buffer_1.VertexBuffer.PositionKind], ['rotation', 'pivot', 'vertextTranslation', 'vertexScaling', 'diffuseUVScaling', 'diffuseUVTranslation', 'opacityUVScaling', 'opacityUVTranslation', 'vertexSkewing'], ['diffuseSampler', 'opacitySampler', 'backgroundSampler']);
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
     * Resets the drawing options to their default values.
     */
    TextureCanvas.prototype.resetOptions = function () {
        this._textureDrawOptions = TextureCanvas.getDefaultTextureDrawOptions();
    };
    /**
     * Sets which area of the diffuse texture to draw.
     *
     * @param u The u-coordinate from which to draw.
     * @param v The v-coordinate from which to draw.
     * @param width The width of the area to be drawn, ranging from 0.0 to 1.0
     * @param height The height of the area to be drawn, ranging from 0.0 to 1.0
     */
    TextureCanvas.prototype.setDiffuseSamplingRect = function (u, v, width, height) {
        if (u === void 0) { u = this._defaultTextureDrawOptions.su; }
        if (v === void 0) { v = this._defaultTextureDrawOptions.sv; }
        if (width === void 0) { width = this._defaultTextureDrawOptions.sWidth; }
        if (height === void 0) { height = this._defaultTextureDrawOptions.sHeight; }
        this._textureDrawOptions.su = u;
        this._textureDrawOptions.sv = v;
        this._textureDrawOptions.sWidth = width;
        this._textureDrawOptions.sHeight = height;
    };
    /**
     * Sets a texture to be used as the diffuse texture's alpha channel.
     *
     * @param texture The texture to use as the diffuse texture's alpha channel.
     */
    TextureCanvas.prototype.setOpacityTexture = function (texture) {
        this._textureDrawOptions.opacityTexture = texture;
    };
    /**
     * Sets which area of the opacity texture to draw.
     *
     * @param u The u-coordinate from which to draw.
     * @param v The v-coordinate from which to draw.
     * @param width The width of the area to be drawn, ranging from 0.0 to 1.0
     * @param height The height of the area to be drawn, ranging from 0.0 to 1.0
     */
    TextureCanvas.prototype.setOpacitySamplingRect = function (u, v, width, height) {
        if (u === void 0) { u = this._defaultTextureDrawOptions.ou; }
        if (v === void 0) { v = this._defaultTextureDrawOptions.ov; }
        if (width === void 0) { width = this._defaultTextureDrawOptions.oWidth; }
        if (height === void 0) { height = this._defaultTextureDrawOptions.oHeight; }
        this._textureDrawOptions.ou = u;
        this._textureDrawOptions.ov = v;
        this._textureDrawOptions.oWidth = width;
        this._textureDrawOptions.oHeight = height;
    };
    /**
     * Sets which area of this texture to draw to — this area may be tranformed by rotating/skewing
     *
     * @param u The u-coordinate of this texture at which to draw the diffuse texture, with the origin being the bottom-left corner.
     * @param v The v-coordinate of this texture at which to draw the diffuse texture, with the origin being the bottom-left corner.
     * @param width The width to draw the texture at, ranging from 0.0 to 1.0
     * @param height The height to draw the texture at, ranging from 0.0 to 1.0
     */
    TextureCanvas.prototype.setDestinationRect = function (u, v, width, height) {
        if (u === void 0) { u = this._defaultTextureDrawOptions.du; }
        if (v === void 0) { v = this._defaultTextureDrawOptions.dv; }
        if (width === void 0) { width = this._defaultTextureDrawOptions.dWidth; }
        if (height === void 0) { height = this._defaultTextureDrawOptions.dHeight; }
        this._textureDrawOptions.du = u;
        this._textureDrawOptions.dv = v;
        this._textureDrawOptions.dWidth = width;
        this._textureDrawOptions.dHeight = height;
    };
    /**
     * Sets the rotation in radians to rotate the diffuse textures by.
     *
     * @param rotation The rotation in radians to rotate the diffuse textures by.
     */
    TextureCanvas.prototype.setRotation = function (rotation) {
        if (rotation === void 0) { rotation = this._defaultTextureDrawOptions.rotation; }
        this._textureDrawOptions.rotation = rotation;
    };
    /**
     * Sets the point around which to rotate the texture.
     *
     * @param pu The u-coordinate of the rotation pivot point.
     * @param pv The v-coordinate of the rotation pivot point.
     * @param isLocalSpace Whether the pivot coordinates are in local space (of the diffuse textures) or in world space (of this texture).
     */
    TextureCanvas.prototype.setPivotPoint = function (pu, pv, isLocalSpace) {
        if (pu === void 0) { pu = this._defaultTextureDrawOptions.pu; }
        if (pv === void 0) { pv = this._defaultTextureDrawOptions.pv; }
        if (isLocalSpace === void 0) { isLocalSpace = this._defaultTextureDrawOptions.pIsLocalSpace; }
        this._textureDrawOptions.pu = pu;
        this._textureDrawOptions.pv = pv;
        this._textureDrawOptions.pIsLocalSpace = isLocalSpace;
    };
    /**
     * Sets how the texture should be skewed (sheared).
     *
     * @param u The horizontal skewing factor.
     * @param v The vertical skewing factor.
     */
    TextureCanvas.prototype.setSkewing = function (u, v) {
        if (u === void 0) { u = this._defaultTextureDrawOptions.skewU; }
        if (v === void 0) { v = this._textureDrawOptions.skewV; }
        this._textureDrawOptions.skewU = u;
        this._textureDrawOptions.skewV = v;
    };
    /**
     * Draws a texture.
     *
     * @param diffuseTexture The texture to draw.
     */
    TextureCanvas.prototype.drawTexture = function (diffuseTexture, textureDrawOptions) {
        if (textureDrawOptions === void 0) { textureDrawOptions = this._textureDrawOptions; }
        if (this.isReady()) {
            var engine = this._engine;
            var effect = this._effect;
            var gl = engine._gl;
            var p = textureDrawOptions;
            if (!p.opacityTexture) {
                p.opacityTexture = diffuseTexture;
                p.ou = p.du;
                p.ov = p.dv;
                p.oWidth = p.dWidth;
                p.oHeight = p.dHeight;
            }
            var pivotU = void 0;
            var pivotV = void 0;
            var vertexTranslationX = p.dWidth - 1 + p.du * 2;
            var vertexTranslationY = p.dHeight - 1 + p.dv * 2;
            if (p.pIsLocalSpace) {
                var _pu = (p.pu * 2 - 1) * p.dWidth;
                var _pv = (p.pv * 2 - 1) * p.dHeight;
                pivotU = _pu + _pv * p.skewU + vertexTranslationX;
                pivotV = _pv + _pu * p.skewV + vertexTranslationY;
            }
            else {
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
            engine.drawElementsType(material_1.Material.TriangleFillMode, 0, 6);
            // Render to self
            engine._bindTextureDirectly(gl.TEXTURE_2D, this._texture, true);
            gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, this._texture.width, this._texture.height, 0);
            engine.unBindFramebuffer(this._backBuffer._texture, !this._generateMipMaps);
        }
    };
    /**
     * Clears this texture using the set clearColor
     */
    TextureCanvas.prototype.clear = function () {
        // Backbuffer
        this._engine.bindFramebuffer(this._backBuffer._texture);
        this._engine.clear(this.clearColor, true, false, false);
        this._engine.unBindFramebuffer(this._backBuffer._texture, !this._generateMipMaps);
        // Self
        this._engine.bindFramebuffer(this._texture);
        this._engine.clear(this.clearColor, true, false, false);
        this._engine.unBindFramebuffer(this._texture, !this._generateMipMaps);
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
    TextureCanvas.getDefaultTextureDrawOptions = function () {
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
        };
    };
    return TextureCanvas;
}(texture_1.Texture));
exports.TextureCanvas = TextureCanvas;
