precision mediump float;

attribute vec3	vertexPosition;
varying vec2	textureCoord;
uniform vec4	viewport;

void main(void) {
    textureCoord = vertexPosition.xy * 0.5 + 0.5;
    textureCoord.x *= viewport.x/viewport.z;
    textureCoord.y *= viewport.y/viewport.w;
    gl_Position = vec4(vertexPosition, 1.0);
}