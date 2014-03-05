/*
 * Cloth
 */
 
var Cloth = function (material, camera, scene, parameters) {
    parameters = parameters || {};
     
    this.simulationSamples = parameters.simulationSamples || 10;
     
    this.width = parameters.width || 2;
    this.height = parameters.height || 1.5;
    this.mass = parameters.mass || 0.3;
    
    this.subDivsX = parameters.subDivsX || 30;
    this.subDivsY = parameters.subDivsY || 15;
    this.springsConstant = parameters.springsConstant || 1;
    this.dampersFactor = parameters.dampersFactor || 0.01;
    this.bendingDampersWidth = parameters.bendingDampersWidth || 3;
    this.bendingDampersHeight = parameters.bendingDampersHeight || 3;
    
    this.particles = [];
    this.springDampers = [];
    
    this.attached = true;
    this.attachedParticles = [];
    
    // Create cloth controls
    this.control = new THREE.TransformControls(camera, renderer.domElement);
	var controlMesh = new THREE.Mesh(new THREE.BoxGeometry(0.0001, 0.0001, 0.0001), material);
	this.control.attach(controlMesh);
	scene.add(controlMesh);
	//scene.add(this.control);
	this.control.size = 0.8;
	controlMesh.position.y = this.height + 2.5 + plane.position.y;
	this.control.position.y = this.height + 2.5 + plane.position.y;
	this.control.update();
     
    // Create particles
    var x, y, particle;
     
    for (var x = 0; x < this.subDivsX; x += 1) {
        for (var y = 0; y < this.subDivsY; y += 1) {
            particle = {
                mass: this.mass / (this.subDivsX*this.subDivsY),
                position: new THREE.Vector3(
                    (x/this.subDivsX)*this.width - this.width/2,
                    //0,
                    -(y/this.subDivsY)*this.height,
                    0
                ),
                velocity: new THREE.Vector3(),
                acceleration: new THREE.Vector3(),
                force: new THREE.Vector3(),
                offset: new THREE.Vector3()
            };
            particle.position.add(this.control.position);
            // Initial position of the particle (used to move cloth arround)
            particle.offset.copy(particle.position).sub(this.control.position);
            this.particles.push(particle);
        }
    }
    
    // Create spring-dampers
    var p1, p2, p3, p4, tmp = new THREE.Vector3(), length, length2;
    for (x = 0; x < this.subDivsX - 1; x += 1) {
        for (y = 0; y < this.subDivsY - 1; y += 1) {
            p1 = this.particles[(x + 0)*this.subDivsY + (y + 0)];
            p2 = this.particles[(x + 1)*this.subDivsY + (y + 0)];
            p3 = this.particles[(x + 1)*this.subDivsY + (y + 1)];
            p4 = this.particles[(x + 0)*this.subDivsY + (y + 1)];
            length = tmp.copy(p2.position).sub(p1.position).length();
            length2 = tmp.copy(p3.position).sub(p1.position).length();
            
            // Create top left and diagonal dampers
            //  ___
            // |\ /
            // | /
            // |/ \
            //
            
            this.springDampers.push(new SpringDamper([p1, p2], length, this.springsConstant, this.dampersFactor));
            this.springDampers.push(new SpringDamper([p4, p1], length, this.springsConstant, this.dampersFactor));
            this.springDampers.push(new SpringDamper([p1, p3], length2, this.springsConstant, this.dampersFactor));
            this.springDampers.push(new SpringDamper([p2, p4], length2, this.springsConstant, this.dampersFactor));
            
            // For cloth extremes, create bottom right dampers
            //  
            //    |
            // ___|
            //
            
            if (x + 1 == this.subDivsX - 1) {
                this.springDampers.push(new SpringDamper([p2, p3], length, this.springsConstant, this.dampersFactor));
            }
            if (y + 1 == this.subDivsY - 1) {
                this.springDampers.push(new SpringDamper([p3, p4], length, this.springsConstant, this.dampersFactor));
            }                        
            
        }
    }
    
    // Add bending forces dampers
    for (x = 0; x < this.subDivsX - 1; x += this.bendingDampersWidth) {
        for (y = 0; y < this.subDivsY - 1; y += this.bendingDampersHeight) {
            p1 = this.particles[(x + 0)*this.subDivsY + (y + 0)];
            p2 = this.particles[(x + 1)*this.subDivsY + (y + 0)];
            p3 = this.particles[(x + 1)*this.subDivsY + (y + 1)];
            p4 = this.particles[(x + 0)*this.subDivsY + (y + 1)];
            length = tmp.copy(p2.position).sub(p1.position).length();
            length2 = tmp.copy(p3.position).sub(p1.position).length();
            
            this.springDampers.push(new SpringDamper([p1, p2], length, this.springsConstant, this.dampersFactor));
            this.springDampers.push(new SpringDamper([p4, p1], length, this.springsConstant, this.dampersFactor));
            this.springDampers.push(new SpringDamper([p1, p3], length2, this.springsConstant, this.dampersFactor));
            this.springDampers.push(new SpringDamper([p2, p4], length2, this.springsConstant, this.dampersFactor));
            
            if (x + 1 == this.subDivsX - 1) {
                this.springDampers.push(new SpringDamper([p2, p3], length, this.springsConstant, this.dampersFactor));
            }
            if (y + 1 == this.subDivsY - 1) {
                this.springDampers.push(new SpringDamper([p3, p4], length, this.springsConstant, this.dampersFactor));
            }
        }
    }
    
    // Add little random offsets
    for (x = 0; x < this.particles.length; x += 1) {
        this.particles[x].position.z += ((Math.random()*2)-1) * 0.01;
        this.particles[x].position.x += ((Math.random()*2)-1) * 0.01;
    }
    
    // Set attach particles
    for (var i = 0; i < this.subDivsX; i += 1) {
        particle = this.particles[0*this.subDivsY + i];
        this.attachedParticles.push(particle);
        particle.mass = 0;
    }
    
    // Create geometry
    var geometry = new ClothGeometry(this);
    
    THREE.Mesh.call(this, geometry, material);
}

Cloth.prototype = Object.create(THREE.Mesh.prototype);

Cloth.prototype.animate = function (deltaTime) {
    for (var i = 0; i < this.simulationSamples; i += 1) {
        this.computeForces();
        this.integrateMotion(deltaTime / this.simulationSamples);
        this.handleCollisions();
    }    
    this.geometry.genSmoothNormals();
};

Cloth.prototype.computeForces = function () {
    var particle;
    
    var
        tmp = new THREE.Vector3(),
        i, l
    ;
    
    // Apply world forces
    for (i = 0, l = this.particles.length; i < l; i += 1) {
        particle = this.particles[i];
        
        // Reset force
        particle.force.set(0, 0, 0);
        
        // Apply gravity
        tmp.copy(gravity);
        particle.force.add(tmp.multiplyScalar(particle.mass));
    }
    
    // Apply spring-dampers forces
    for (i = 0, l = this.springDampers.length; i < l; i += 1) {
        this.springDampers[i].applyForces();
    }
    
    // Apply aerodynamic forces
    var
        face, p1, p2, p3,
        v1 = new THREE.Vector3(), v2 = new THREE.Vector3(),
        speed = new THREE.Vector3(), speedL,
        area, force = new THREE.Vector3()
    ;
    for (i = 0, l = this.geometry.faces.length; i < l; i +=1) {
        face = this.geometry.faces[i];
        p1 = this.particles[face.a];
        p2 = this.particles[face.b];
        p3 = this.particles[face.c];
        
        // Compute aerodynamical force for the face
        v1.copy(p2.position).sub(p1.position);
        v2.copy(p3.position).sub(p1.position);
        speed.copy(p1.velocity).add(p2.velocity).add(p3.velocity).divideScalar(3);
        speed.sub(air.speed);
        area = v1.cross(v2).length() / 2;
        speedL = speed.length();
        if (speedL == 0) {
            continue;
        }        
        area = area * (speed.dot(face.normal) / speedL);
        force.copy(face.normal);
        force.multiplyScalar(-0.5 * air.density * (speedL*speedL) * air.dragCoeff * area);
        
        // Apply it to the particles
        force.divideScalar(3);
        p1.force.add(force);
        p2.force.add(force);
        p3.force.add(force);
    }
};

Cloth.prototype.integrateMotion = function (deltaTime) {
    var particle, tmp = new THREE.Vector3(), i, l;
    
    for (i = 0, l = this.particles.length; i < l; i += 1) {
        particle = this.particles[i];
        
        // Apply explicit euler integration
        if (particle.mass > 0) {
            particle.acceleration.copy(particle.force);
            particle.acceleration.divideScalar(particle.mass);
        } else {
            // Attached particles
            if (this.attached) {
                particle.acceleration.set(0, 0, 0);
                particle.position.copy(particle.offset);
                particle.position.applyEuler(this.control.object.rotation);
                particle.position.add(this.control.position);                
            }            
        }
        tmp.copy(particle.acceleration);
        particle.velocity.add(tmp.multiplyScalar(deltaTime));
        tmp.copy(particle.velocity);
        particle.position.add(tmp.multiplyScalar(deltaTime));
        
        // Update geometry
        this.geometry.vertices[i].copy(particle.position);
    }
    
    this.geometry.verticesNeedUpdate = true;
};

Cloth.prototype.handleCollisions = function () {
    var epsilon = 0.01;
    var i, l, particle, v = new THREE.Vector3(), normal = new THREE.Vector3();
    
    for (i = 0, l = this.particles.length; i < l; i += 1) {
        particle = this.particles[i];
        
        // Plane collision
        if (particle.position.y < (plane.position.y + epsilon)) {
            particle.position.y = plane.position.y + epsilon;
            particle.velocity.y = -plane.bounce*particle.velocity.y;
            particle.velocity.x = (1-plane.friction)*particle.velocity.x;
            particle.velocity.z = (1-plane.friction)*particle.velocity.z;
        }
        
        // Sphere collision
        v.copy(particle.position).sub(sphere.position);
        if (v.length() < sphere.geometry.radius + epsilon) {
            normal.copy(v).normalize();
            // Calc intersect point
            v.copy(normal).multiplyScalar(sphere.geometry.radius + epsilon);
            v.add(sphere.position);
            // Apply impulse
            this.applyCollisionImpulse(sphere, particle, v, normal);
            // Reposition particle
            particle.position.copy(v);
        }
    }
};

Cloth.prototype.applyCollisionImpulse = function (object, particle, intersectPoint, normal) {
    var
        pointVelocity = new THREE.Vector3(),
        vClose = new THREE.Vector3(), j, impulse = new THREE.Vector3(),
        v = new THREE.Vector3(), tangent = new THREE.Vector3()
    ;
    
    // Calc speed on object from intersect point and object COM
    v.copy(intersectPoint).sub(object.position);
    pointVelocity.copy(object.angularVelocity).cross(v);
    pointVelocity.add(object.velocity);
    
    vClose.copy(particle.velocity).sub(pointVelocity);
    
    // Normal impulse
    j = -(1 + object.bounce)*(vClose.dot(normal));
    impulse.copy(normal).multiplyScalar(j);
    particle.velocity.add(impulse);
    
    // Friction impulse
    v.copy(normal);
    v.multiplyScalar(v.dot(vClose));
    tangent.copy(vClose).sub(v).normalize();
    
    j = -object.friction*tangent.dot(vClose);
    impulse.copy(tangent).multiplyScalar(j);
    particle.velocity.add(impulse);
}

Cloth.prototype.detach = function () {
    var i, l;
    
    for (i = 0, l = this.attachedParticles.length; i < l; i += 1) {
        this.attachedParticles[i].mass = this.mass / this.particles.length;
    }
    
    this.attached = false;
}