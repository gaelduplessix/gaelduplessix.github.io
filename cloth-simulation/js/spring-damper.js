/*
 * Spring damper
 */
 
var SpringDamper = function (particles, restLength, springConstant, dampingFactor) {
    this.particles = [particles[0], particles[1]];
    this.restLength = restLength;
    this.springConstant = springConstant;
    this.dampingFactor = dampingFactor;
};

SpringDamper.prototype.applyForces = function () {
    var
        e = new THREE.Vector3(), dist,
        v1, v2,
        force, f1 = new THREE.Vector3(), f2 = new THREE.Vector3()
    ;
    
    // e: unit length vector from particle 1 to particle 2
    // dist: distance between particles
    e.copy(this.particles[1].position).sub(this.particles[0].position);
    dist = e.length();
    e.divideScalar(dist);
    
    // v1, v2: closing velocities
    v1 = e.dot(this.particles[0].velocity);
    v2 = e.dot(this.particles[1].velocity);
    
    // Compute 1D force
    force = -this.springConstant*(this.restLength - dist) - this.dampingFactor*(v1 - v2);
    //console.log(this.restLength);
    
    // Compute 3D forces for each particle
    f1.copy(e).multiplyScalar(force);
    f2.sub(f1);
    
    // Apply force to particles
    this.particles[0].force.add(f1);
    this.particles[1].force.add(f2);
};