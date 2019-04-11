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
var TextureCanvasDrawContext = /** @class */ (function () {
    function TextureCanvasDrawContext(textureCanvas) {
        this.textureCanvas = textureCanvas;
        this._defaultTextureDrawOptions = TextureCanvasDrawContext.DEFAULT_TEXTURE_DRAW_OPTIONS;
        /** The u-coordinate of this texture at which to draw the diffuse texture; with the origin being the bottom-left corner. */
        this.du = 0;
        /** The v-coordinate of this texture at which to draw the diffuse texture; with the origin being the bottom-left corner. */
        this.dv = 0;
        /** The width to draw the texture at; ranging from 0.0 to 1.0 */
        this.dWidth = 1;
        /** The height to draw the texture at; ranging from 0.0 to 1.0 */
        this.dHeight = 1;
        /** The u-coordinate of the diffuse texture from which to draw it. */
        this.su = 0;
        /** The v-coordinate of the diffuse texture from which to draw it. */
        this.sv = 0;
        /** The width of the region of the diffuse texture to be drawn; ranging from 0.0 to 1.0 */
        this.sWidth = 1;
        /** The height of the region of the diffuse texture to be drawn; ranging from 0.0 to 1.0 */
        this.sHeight = 1;
        /** The rotation in radians to rotate the diffuse textures by. */
        this.rotation = 0;
        /** The u-coordinate of the rotation pivot point. */
        this.pu = 0.5;
        /** The v-coordinate of the rotation pivot point. */
        this.pv = 0.5;
        /** Whether the pivot coordinates are in local space (of the diffuse textures) or in world space (of the canvas). */
        this.pIsLocalSpace = true;
        /** The horizontal skewing factor. */
        this.skewU = 0;
        /** The vertical skewing factor. */
        this.skewV = 0;
        /** The u-coordinate of the opacity texture from which to draw it. */
        this.ou = 0;
        /** The v-coordinate of the opacity texture from which to draw it. */
        this.ov = 0;
        /** The width of the region of the opacity texture to be drawn; ranging from 0.0 to 1.0 */
        this.oWidth = 1;
        /** The height of the region of the opacity texture to be drawn; ranging from 0.0 to 1.0 */
        this.oHeight = 1;
        /** The color to clear the canvas with. */
        this.clearColor = new math_1.Color4(0.0, 0.0, 0.0, 0.0);
    }
    /**
     * Resets the draw options to their default values.
     */
    TextureCanvasDrawContext.prototype.reset = function () {
        this._defaultTextureDrawOptions.clone(true, this);
    };
    /**
     * Sets the texture to draw.
     *
     * @param texture The texture to draw.
     */
    TextureCanvasDrawContext.prototype.setDiffuseTexture = function (texture) {
        this.diffuseTexture = texture;
    };
    /**
     * Sets a texture to be used as the diffuse texture's alpha channel.
     *
     * @param texture The texture to use as the diffuse texture's alpha channel.
     */
    TextureCanvasDrawContext.prototype.setOpacityTexture = function (texture) {
        this.opacityTexture = texture;
    };
    /**
     * Sets which area of the diffuse texture to draw.
     *
     * @param u The u-coordinate from which to draw.
     * @param v The v-coordinate from which to draw.
     * @param width The width of the area to be drawn, ranging from 0.0 to 1.0
     * @param height The height of the area to be drawn, ranging from 0.0 to 1.0
     */
    TextureCanvasDrawContext.prototype.setDiffuseSamplingRect = function (u, v, width, height) {
        if (u === void 0) { u = this._defaultTextureDrawOptions.su; }
        if (v === void 0) { v = this._defaultTextureDrawOptions.sv; }
        if (width === void 0) { width = this._defaultTextureDrawOptions.sWidth; }
        if (height === void 0) { height = this._defaultTextureDrawOptions.sHeight; }
        this.su = u;
        this.sv = v;
        this.sWidth = width;
        this.sHeight = height;
    };
    /**
     * Sets which area of the opacity texture to draw.
     *
     * @param u The u-coordinate from which to draw.
     * @param v The v-coordinate from which to draw.
     * @param width The width of the area to be drawn, ranging from 0.0 to 1.0
     * @param height The height of the area to be drawn, ranging from 0.0 to 1.0
     */
    TextureCanvasDrawContext.prototype.setOpacitySamplingRect = function (u, v, width, height) {
        if (u === void 0) { u = this._defaultTextureDrawOptions.ou; }
        if (v === void 0) { v = this._defaultTextureDrawOptions.ov; }
        if (width === void 0) { width = this._defaultTextureDrawOptions.oWidth; }
        if (height === void 0) { height = this._defaultTextureDrawOptions.oHeight; }
        this.ou = u;
        this.ov = v;
        this.oWidth = width;
        this.oHeight = height;
    };
    /**
     * Sets which area of this texture to draw to — this area may be tranformed by rotating/skewing.
     *
     * @param u The u-coordinate of this texture at which to draw the diffuse texture, with the origin being the bottom-left corner.
     * @param v The v-coordinate of this texture at which to draw the diffuse texture, with the origin being the bottom-left corner.
     * @param width The width to draw the texture at, ranging from 0.0 to 1.0
     * @param height The height to draw the texture at, ranging from 0.0 to 1.0
     */
    TextureCanvasDrawContext.prototype.setDrawRect = function (u, v, width, height) {
        if (u === void 0) { u = this._defaultTextureDrawOptions.du; }
        if (v === void 0) { v = this._defaultTextureDrawOptions.dv; }
        if (width === void 0) { width = this._defaultTextureDrawOptions.dWidth; }
        if (height === void 0) { height = this._defaultTextureDrawOptions.dHeight; }
        this.du = u;
        this.dv = v;
        this.dWidth = width;
        this.dHeight = height;
    };
    /**
     * Sets the rotation in radians to rotate the diffuse texture by.
     *
     * @param rotation The rotation in radians to rotate the diffuse textures by.
     */
    TextureCanvasDrawContext.prototype.setRotation = function (rotation) {
        if (rotation === void 0) { rotation = this._defaultTextureDrawOptions.rotation; }
        this.rotation = rotation;
    };
    /**
     * Sets the point around which to rotate the texture.
     *
     * @param pu The u-coordinate of the rotation pivot point.
     * @param pv The v-coordinate of the rotation pivot point.
     * @param isLocalSpace Whether the pivot coordinates are in local space (of the diffuse textures) or in world space (of this texture).
     */
    TextureCanvasDrawContext.prototype.setPivotPoint = function (pu, pv, isLocalSpace) {
        if (pu === void 0) { pu = this._defaultTextureDrawOptions.pu; }
        if (pv === void 0) { pv = this._defaultTextureDrawOptions.pv; }
        if (isLocalSpace === void 0) { isLocalSpace = this._defaultTextureDrawOptions.pIsLocalSpace; }
        this.pu = pu;
        this.pv = pv;
        this.pIsLocalSpace = isLocalSpace;
    };
    /**
     * Sets how the texture should be skewed (shear transform).
     *
     * @param u The horizontal skewing factor.
     * @param v The vertical skewing factor.
     */
    TextureCanvasDrawContext.prototype.setSkewing = function (u, v) {
        if (u === void 0) { u = this._defaultTextureDrawOptions.skewU; }
        if (v === void 0) { v = this._defaultTextureDrawOptions.skewV; }
        this.skewU = u;
        this.skewV = v;
    };
    /**
     * Draws the diffuse texture, if set.
     */
    TextureCanvasDrawContext.prototype.draw = function () {
        this.textureCanvas.draw(this);
    };
    /**
     * Draws a texture.
     *
     * @param diffuseTexture The texture to draw.
     */
    TextureCanvasDrawContext.prototype.drawTexture = function (diffuseTexture) {
        this.textureCanvas.drawTexture(diffuseTexture, this);
    };
    /**
     * Clears the canvas using the set clearColor.
     */
    TextureCanvasDrawContext.prototype.clear = function () {
        this.textureCanvas.clear(this);
    };
    /**
     * Returns a clone of this context.
     *
     * @param deep Wether to clone the member objects.
     * @param ref The context to clone into.
     */
    TextureCanvasDrawContext.prototype.clone = function (deep, ref) {
        if (deep === void 0) { deep = false; }
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
    };
    TextureCanvasDrawContext.DEFAULT_TEXTURE_DRAW_OPTIONS = new TextureCanvasDrawContext();
    return TextureCanvasDrawContext;
}());
exports.TextureCanvasDrawContext = TextureCanvasDrawContext;
var TextureCanvas = /** @class */ (function (_super) {
    __extends(TextureCanvas, _super);
    function TextureCanvas(size, scene, onReady, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, null, scene, !options.generateMipMaps, false, options.samplingMode) || this;
        _this._vertexBuffers = {};
        _this._defaultDrawContext = new TextureCanvasDrawContext(_this);
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
     *
     * @returns true if ready, otherwise, false.
     */
    TextureCanvas.prototype.isReady = function () {
        if (!this._effect.isReady()) {
            return false;
        }
        return _super.prototype.isReady.call(this);
    };
    /**
     * Draws the diffuse texture, if set.
     *
     * @param ctx The texture draw options.
     */
    TextureCanvas.prototype.draw = function (ctx) {
        if (ctx === void 0) { ctx = this._defaultDrawContext; }
        if (ctx.diffuseTexture) {
            this.drawTexture(ctx.diffuseTexture, ctx);
        }
    };
    /**
     * Draws a texture.
     *
     * @param diffuseTexture The texture to draw.
     * @param ctx The texture draw context.
     */
    TextureCanvas.prototype.drawTexture = function (diffuseTexture, ctx) {
        if (ctx === void 0) { ctx = this._defaultDrawContext; }
        var isReady = this.isReady();
        if (isReady) {
            var engine = this._engine;
            var effect = this._effect;
            var gl = engine._gl;
            var pivotU = void 0;
            var pivotV = void 0;
            var vertexTranslationX = ctx.dWidth - 1 + ctx.du * 2;
            var vertexTranslationY = ctx.dHeight - 1 + ctx.dv * 2;
            if (ctx.pIsLocalSpace) {
                var _pu = (ctx.pu * 2 - 1) * ctx.dWidth;
                var _pv = (ctx.pv * 2 - 1) * ctx.dHeight;
                pivotU = _pu + _pv * ctx.skewU + vertexTranslationX;
                pivotV = _pv + _pu * ctx.skewV + vertexTranslationY;
            }
            else {
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
            }
            else {
                effect.setTexture('opacitySampler', diffuseTexture);
                effect.setFloat2('opacityUVScaling', ctx.dWidth, ctx.dHeight);
                effect.setFloat2('opacityUVTranslation', ctx.du, ctx.dv);
            }
            effect.setFloat2('vertexSkewing', ctx.skewU, ctx.skewV);
            // Render to backbuffer
            engine.drawElementsType(material_1.Material.TriangleFillMode, 0, 6);
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
    };
    /**
     * Clears this texture using clearColor from the provided context.
     */
    TextureCanvas.prototype.clear = function (ctx) {
        if (ctx === void 0) { ctx = this._defaultDrawContext; }
        // Backbuffer
        this._engine.bindFramebuffer(this._backBuffer._texture);
        this._engine.clear(ctx.clearColor, true, false, false);
        this._engine.unBindFramebuffer(this._backBuffer._texture, !this._generateMipMaps);
        // Self
        this._engine.bindFramebuffer(this._texture);
        this._engine.clear(ctx.clearColor, true, false, false);
        this._engine.unBindFramebuffer(this._texture, !this._generateMipMaps);
    };
    /**
    * Resize the texture to new value.
    *
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
    /**
     * Creates a new draw context. Does NOT invalidate other contexts created.
     */
    TextureCanvas.prototype.createContext = function () {
        return new TextureCanvasDrawContext(this);
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
            if (_this._previousDrawInfo && _this._previousDrawInfo.wasReady) {
                canvas.drawTexture(_this._previousDrawInfo.diffuseTexture, _this._previousDrawInfo.drawContext);
            }
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
