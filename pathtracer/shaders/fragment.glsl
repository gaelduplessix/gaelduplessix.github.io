precision mediump float;

//
// Custom types
//
struct Ray {
    vec3	origin;
    vec3	direction;
};

struct Material {
    vec3	color;
    float	diffuse;
    float	specular;
    float	reflection;
    float	refraction;
    float	shininess;
    float	glossiness;
};

struct Object {
    int			type;
    vec3		position;
    Material	material;
    vec3		data;
    vec3		data2;
};

struct Light {
    int     type;
    vec3	color;
    float   intensity;
    vec3	v1, v2, v3;
};

struct Camera {
    vec3	position;
    vec3	target;
    vec2	size;
    vec3	upVector;
    float	nearClippingPlane;
    float	fovy;
    float	aperture;
    float	focusDistance;
};

// Constants
const float NO_INTERSECT = -1.0;
const float PI = 3.14159265359;
const float EPSILON = 0.001;
const float COLOR_EPSILON = 0.5/255.0;

// Object types
const int LIGHT = 0;
const int SPHERE = 1;
const int PLANE = 2;
const int CUBE = 3;
const int PARALLELOGRAM = 4;
const int PARALLELOGRAM_LIGHT = 5;

// Light types
const int POINT_LIGHT = 0;
const int AREA_LIGHT = 1;

//
// Uniforms
//
uniform sampler2D	texture;
varying vec2		textureCoord;
uniform	float		sampleWeight;

// General configuration
uniform vec4	viewport;
uniform float	time;

// Scene
uniform Camera	camera;
uniform vec3	backgroundColor;
uniform float	exposure;

const int 		NB_OBJECTS = {NB_OBJECTS};
const int		NB_LIGHTS = {NB_LIGHTS};
uniform Object	objects[NB_OBJECTS];
uniform Light	lights[NB_LIGHTS];

//
// Random generators, from http://madebyevan.com/webgl-path-tracing/webgl-path-tracing.js
//
float random(in vec3 scale, in float seed) {
    return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);
}

// Random cosine-weighted distributed vector
// from http://www.rorydriscoll.com/2009/01/07/better-sampling/
vec3 cosineWeightedDirection(in float seed, in vec3 normal) {
    float u = random(vec3(12.9898, 78.233, 151.7182), seed);
    float v = random(vec3(63.7264, 10.873, 623.6736), seed);
    float r = sqrt(u);
    float angle = 6.283185307179586 * v;
    // compute basis from normal
    vec3 sdir, tdir;
    if (abs(normal.x) < .5) {
        sdir = cross(normal, vec3(1,0,0));
    } else {
        sdir = cross(normal, vec3(0,1,0));
    }
    tdir = cross(normal, sdir);
    return r*cos(angle)*sdir + r*sin(angle)*tdir + sqrt(1.-u)*normal;
}

// random normalized vector
vec3 uniformlyRandomDirection(in float seed) {
    float u = random(vec3(12.9898, 78.233, 151.7182), seed);
    float v = random(vec3(63.7264, 10.873, 623.6736), seed);
    float z = 1.0 - 2.0 * u;
    float r = sqrt(1.0 - z * z);
    float angle = 6.283185307179586 * v;
    return vec3(r * cos(angle), r * sin(angle), z);
}

// random vector in the unit sphere
vec3 uniformlyRandomVector(float seed) {
    return uniformlyRandomDirection(seed) * sqrt(random(vec3(36.7539, 50.3658, 306.2759), seed));
}

// Return a view ray of the camera
// From http://schabby.de/picking-opengl-ray-tracing/
Ray getCameraRay(in vec2 point) {
    Ray cameraRay;

    // Randomize pixel point for antialiasing
    point += uniformlyRandomDirection(time + dot(point,point)).xy / viewport.xy;

    vec3 view = normalize(camera.target - camera.position);
    vec3 h = normalize(cross(view, camera.upVector));
    vec3 v = normalize(cross(h, view));

    float rad = camera.fovy * PI / 180.0;
    float vLength = tan(rad / 2.0) * camera.nearClippingPlane;
    float hLength = vLength * (camera.size.x / camera.size.y);

    h *= hLength;
    v *= vLength;

    vec2 screenSpace = 2.0 * point - 1.0;

    vec3 pos = camera.position + view * camera.nearClippingPlane + h * screenSpace.x + v * screenSpace.y;
    vec3 dir = normalize(pos - camera.position);

    cameraRay.origin = camera.position;
    cameraRay.direction = dir;

    if (camera.aperture > 0.0) {
        // Add depth of fielf :)
        vec3 focusPoint = camera.position + dir * camera.focusDistance;
        // The first version if false because if moves the origin point on 3d space
        cameraRay.origin = cameraRay.origin + uniformlyRandomDirection(time + dot(point,point)) * camera.aperture;
        // This version should be right but behaves strangely...
        //cameraRay.origin += (v/vLength * random(vec3(0.9898, 0.654, 0.2343), time + dot(point, point)) * 2.0 - 1.0) * camera.aperture
        //				  + (h/hLength * random(vec3(0.724, 0.125, 0.571), time + dot(point, point)) * 2.0 - 1.0) * camera.aperture;
        cameraRay.direction = normalize(focusPoint - cameraRay.origin);
    }

    return cameraRay;
}

float intersectWithSphere(in Ray ray, in vec3 position, in float radius) {
    // From http://en.wikipedia.org/wiki/Line–sphere_intersection
    vec3 oc = ray.origin - position;
    float a = dot(ray.direction, ray.direction);
    float b = 2.0 * dot(ray.direction, oc);
    float c = dot(oc, oc) - radius * radius;
    float delta = b*b - 4.0*a*c;
    if (delta > 0.0) {
        float d = (-b - sqrt(delta)) / (2.0*a);
        if (d > 0.0)
            return d;
    }
    return NO_INTERSECT;
}

float intersectWithPlane(in Ray ray, in vec3 position, in vec3 normal) {
    // From http://en.wikipedia.org/wiki/Line-plane_intersection
    float denom = dot(ray.direction, normal);
    if (denom != 0.0) {
        return dot((position - ray.origin), normal) / denom;
    }
    return NO_INTERSECT;
}

float intersectWithCube(in Ray ray, in vec3 pmin, in vec3 pmax) {
    // From http://madebyevan.com/webgl-path-tracing/webgl-path-tracing.js
    vec3 tMin = (pmin - ray.origin) / ray.direction;
    vec3 tMax = (pmax - ray.origin) / ray.direction;
    vec3 t1 = min(tMin, tMax);
    vec3 t2 = max(tMin, tMax);
    float tNear = max(max(t1.x, t1.y), t1.z);
    float tFar = min(min(t2.x, t2.y), t2.z);
    if (tNear > tFar)
        return NO_INTERSECT;
    return tNear;
}

float intersectWithTriangle(in Ray ray, in vec3 a, in vec3 b, in vec3 c) {
    vec3 oa = ray.origin - a, ca = c - a, ba = b - a;
    vec3 normal = cross(ba, ca);
    float det = dot(-ray.direction, normal);

    // Determinant null
    if (det == 0.0) {
        return NO_INTERSECT;
    }

    float alpha = dot(-ray.direction, cross(oa, ca)) / det;
    if (alpha <= 0.0 || alpha >= 1.0) {
        return NO_INTERSECT;
    }

    float beta = dot(-ray.direction, cross(ba, oa)) / det;
    if (beta <= 0.0 || beta >= 1.0) {
        return NO_INTERSECT;
    }

    if (alpha + beta >= 1.0) {
        return NO_INTERSECT;
    }

    float t = dot(oa, normal) / det;
    if (t < EPSILON) {
        return NO_INTERSECT;
    }
    return t;
}

float intersectWithParallelogram(in Ray ray, in vec3 pos, in vec3 v1, in vec3 v2) {
    float t = intersectWithTriangle(ray, pos, pos+v1, pos+v2);
    if (t == NO_INTERSECT) {
        t = intersectWithTriangle(ray, pos+v1+v2, pos+v1, pos+v2);
    }
    return t;
}

void intersectWithObject(in Ray ray, in Object object, inout float kMin, inout Object intersectedObject) {
    float k = NO_INTERSECT;

    if (object.type == SPHERE) {
        k = intersectWithSphere(ray, object.position, object.data.x);
    } else if (object.type == PLANE) {
        k = intersectWithPlane(ray, object.position, object.data);
    } else if (object.type == CUBE) {
             k = intersectWithCube(ray, object.position, object.data);
    } else if (object.type == PARALLELOGRAM || object.type == PARALLELOGRAM_LIGHT) {
        k = intersectWithParallelogram(ray, object.position, object.data, object.data2);
    }

    if (k != NO_INTERSECT && k > EPSILON && (kMin == NO_INTERSECT || k < kMin)) {
        kMin = k;
        intersectedObject = object;
    }
}

vec3 getNormalAtPoint(in Object object, in vec3 intersectPoint) {
    if (object.type == SPHERE) {
        return normalize(intersectPoint - object.position);
    } else if (object.type == PLANE) {
        return object.data;
    } else if (object.type == CUBE) {
        if (intersectPoint.x < object.position.x + EPSILON) return vec3(-1.0, 0.0, 0.0);
        else if(intersectPoint.x > object.data.x - EPSILON) return vec3(1.0, 0.0, 0.0);
        else if(intersectPoint.y < object.position.y + EPSILON) return vec3(0.0, -1.0, 0.0);
        else if(intersectPoint.y > object.data.y - EPSILON) return vec3(0.0, 1.0, 0.0);
        else if(intersectPoint.z < object.position.z + EPSILON) return vec3(0.0, 0.0, -1.0);
        else return vec3(0.0, 0.0, 1.0);
    } else if (object.type == PARALLELOGRAM) {
        return normalize(cross(object.data, object.data2));
    }

    return vec3(0.0, 0.0, 0.0);
}

float intersectWithObjects(in Ray ray, inout Object intersectedObject) {
    float kMin = NO_INTERSECT;

    {INTERSECT_WITH_OBJECTS}
    // intersectWithObject(ray, objects[0], kMin, intersectedObject);...

    return kMin;
}

bool castShadowWithObject(in Ray ray, in Object object, in float maxDist) {
    float k = NO_INTERSECT;

    if (object.type == SPHERE)
        k = intersectWithSphere(ray, object.position, object.data.x);
    else if (object.type == PLANE)
        k = intersectWithPlane(ray, object.position, object.data);
    else if (object.type == CUBE)
        k = intersectWithCube(ray, object.position, object.data);
    else if (object.type == PARALLELOGRAM)
        k = intersectWithParallelogram(ray, object.position, object.data, object.data2);

    if (k != NO_INTERSECT && k > EPSILON && k < maxDist) {
        return true;
    }
    return false;
}

bool castShadow(in Ray ray, float maxDist) {

    {CAST_SHADOW}
    // if (castShadowWithObject(ray, objects[0], maxDist)) return true;...

    return false;
}

vec3 evaluateObjectBRDF(in Object object, in Ray ray, in vec3 incident, in vec3 normal) {
    // Matte material
    return object.material.color / PI;
}

vec3 pointLightDirectLighting(in Ray ray, in Light light, in Object object, in vec3 intersectPoint, in vec3 normal,
                              out vec3 incident, out Ray lightRay, out float tmax) {
    vec3 toLight = light.v1 - intersectPoint;
    float decay = 1.0 / dot(toLight, toLight);

    incident = normalize(toLight);
    lightRay.origin = intersectPoint;
    lightRay.direction = toLight;
    tmax = length(toLight);

    return light.color * light.intensity * decay;
}

vec3 areaLightDirectLighting(in Ray ray, in Light light, in Object object, in vec3 intersectPoint, in vec3 normal,
                             out vec3 incident, out Ray lightRay, out float tmax) {
    // Sample position
    float t1 = random(vec3(12.9898, 78.233, 151.7182), time+dot(intersectPoint, incident));
    float t2 = random(vec3(93.0295, 50.924, 583.9853), time*t1+dot(ray.direction, intersectPoint));
    vec3 pos = light.v1 + t1*light.v2 + t2*light.v3;
    vec3 n = normalize(cross(light.v2, light.v3));

    vec3 toLight = pos - intersectPoint;
    float decay = 1.0 / dot(toLight, toLight);

    incident = normalize(toLight);
    lightRay.origin = intersectPoint;
    lightRay.direction = toLight;
    tmax = length(toLight);

    return light.color * light.intensity * decay * dot(n, normalize(toLight));
}

vec3 calcDirectLightingForLight(in Ray ray, in Light light, in Object object, in vec3 intersectPoint, in vec3 normal) {
    vec3 li = vec3(0.0);
    vec3 incident;
    Ray lightRay;
    float tmax;

    // Get light illumination at point
    if (light.type == POINT_LIGHT) {
        li += pointLightDirectLighting(ray, light, object, intersectPoint, normal, incident, lightRay, tmax);
    } else if (light.type == AREA_LIGHT) {
        li += areaLightDirectLighting(ray, light, object, intersectPoint, normal, incident, lightRay, tmax);
    }

    if (li.r < COLOR_EPSILON && li.g < COLOR_EPSILON && li.b < COLOR_EPSILON) {
        return vec3(0.0);
    }

    float cosine = dot(incident, normal);

    if (cosine < 0.0) {
        return vec3(0.0);
    }

    li *= cosine;

    // Evaluate object brdf at point
    vec3 f = evaluateObjectBRDF(object, ray, incident, normal);

    if (f.r < COLOR_EPSILON && f.g < COLOR_EPSILON && f.b < COLOR_EPSILON) {
        return vec3(0.0);
    }

    li *= f;

    // Cast shadow
    if (castShadow(lightRay, tmax)) {
        return vec3(0.0);
    }

    return li;
}

vec3 calcDirectLighting(in Ray ray, in Object object, in vec3 intersectPoint, in vec3 normal) {
    vec3 directLighting = vec3(0.0, 0.0, 0.0);

    {CALC_DIRECT_LIGHTING}
    // directLighting += calcDirectLightingForLight(ray, lights[0], object, intersectPoint, normal);...

    return directLighting;
}

vec3 getBRDFRay(inout Ray ray, in Object intersectedObject, in vec3 intersectPoint, in vec3 normal) {
    ray.origin = intersectPoint;
    ray.direction = cosineWeightedDirection(time+dot(intersectPoint, normal), normal);
    return intersectedObject.material.color;
}

vec3 traceRay(in Ray ray) {
    vec3 finalColor = vec3(0.0, 0.0, 0.0);
    vec3 weight = vec3(1.0, 1.0, 1.0);

    for (int i = 0; i < {MAX_PATH_LENGTH}; ++i) {
        Object intersectedObject;
        float k = intersectWithObjects(ray, intersectedObject);

        if (k == NO_INTERSECT) {
            finalColor += weight * backgroundColor;
            break;
        }

        // Intersection with an area light
        if (intersectedObject.type == PARALLELOGRAM_LIGHT) {
            finalColor += weight * intersectedObject.material.color;
            break;
        }

        // Get intersect point and normal
        vec3 intersectPoint = ray.origin + ray.direction * k;
        vec3 normal = getNormalAtPoint(intersectedObject, intersectPoint);

        // Direct light
        vec3 directLighting = calcDirectLighting(ray, intersectedObject, intersectPoint, normal);

        // Prepare ray for indirect light
        vec3 brdfWeight = getBRDFRay(ray, intersectedObject, intersectPoint, normal);

        // Add light
        finalColor += weight * directLighting;
        weight *= brdfWeight;

        if (weight.r < COLOR_EPSILON && weight.g < COLOR_EPSILON && weight.b < COLOR_EPSILON) {
            break;
        }
    }

    return finalColor;
}

vec3 tracePixel(vec2 point) {
    vec3 finalColor = traceRay(getCameraRay(point));

    // Exposure
    finalColor = vec3(1.0, 1.0, 1.0) - exp(finalColor * -exposure);

    return finalColor;
}

void main(void) {
    vec3 finalColor = tracePixel(vec2(gl_FragCoord.xy / viewport.xy));
    gl_FragColor = vec4(mix(finalColor, texture2D(texture, textureCoord).rgb, sampleWeight), 1.0);
}