/*
 * Cloth geometry
 */
 
 var ClothGeometry = function (cloth) {
    THREE.Geometry.call(this);
    
    this.cloth = cloth;
        
    for (var x = 0; x < this.cloth.subDivsX; x += 1) {
        for (var y = 0; y < this.cloth.subDivsY; y += 1) {
            var vertex = new THREE.Vector3();
            vertex.copy(this.cloth.particles[x*this.cloth.subDivsY + y].position);
            this.vertices.push(vertex);
        }
    }
    
    for (var x = 0; x < this.cloth.subDivsX - 1; x += 1) {
        for (var y = 0; y < this.cloth.subDivsY - 1; y += 1) {
            var
                p1 = (x + 0)*this.cloth.subDivsY + (y + 0),
                p2 = (x + 1)*this.cloth.subDivsY + (y + 0),
                p3 = (x + 1)*this.cloth.subDivsY + (y + 1),
                p4 = (x + 0)*this.cloth.subDivsY + (y + 1)
                u1 = new THREE.Vector2((x + 0)/(this.cloth.subDivsX - 1), 1- (y + 0)/(this.cloth.subDivsY - 1)),
                u2 = new THREE.Vector2((x + 1)/(this.cloth.subDivsX - 1), 1 - (y + 0)/(this.cloth.subDivsY - 1)),
                u3 = new THREE.Vector2((x + 1)/(this.cloth.subDivsX - 1), 1 - (y + 1)/(this.cloth.subDivsY - 1)),
                u4 = new THREE.Vector2((x + 0)/(this.cloth.subDivsX - 1), 1 - (y + 1)/(this.cloth.subDivsY - 1))
            ;            
            
            var face1 = new THREE.Face3(p1, p2, p3);
            var face2 = new THREE.Face3(p1, p3, p4);
            face1.normal = new THREE.Vector3(0, 0, 1);
            face2.normal = new THREE.Vector3(0, 0, 1);
            this.faces.push(face1);
            this.faceVertexUvs[0].push([u1, u2, u3]);
            this.faces.push(face2);
            this.faceVertexUvs[0].push([u1,u3, u4]);
        }
    }               
};

ClothGeometry.prototype = Object.create(THREE.Geometry.prototype);

ClothGeometry.prototype.genSmoothNormals = function () {    
    // Generate normals for each vertex
    var normals = [];
    for (var i = 0; i < this.vertices.length; i += 1) {
        normals.push(new THREE.Vector3());
        normals[i].smoothCount = 0;
    }
    
    // Compute normals for each face and average
    for (var i = 0; i < this.faces.length; i += 1) {
        var face = this.faces[i];
        var v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), normal = new THREE.Vector3();
        v1.subVectors(this.vertices[face.b], this.vertices[face.a]);
        v2.subVectors(this.vertices[face.c], this.vertices[face.a]);
        normal.crossVectors(v1, v2).normalize();
        face.normal.copy(normal);
        normals[face.a].add(normal).smoothCount += 1;
        normals[face.b].add(normal).smoothCount += 1;
        normals[face.c].add(normal).smoothCount += 1;
    }    
    
    // Set vertices normals
    for (var i = 0; i < this.faces.length; i += 1) {
        var
            face = this.faces[i],
            vertices = [face.a, face.b, face.c]
        ;
        
        for (var j = 0; j < 3; j += 1) {
            if (normals[vertices[j]].smoothCount > 0) {
                normals[vertices[j]].multiplyScalar(1/normals[vertices[j]].smoothCount).normalize();
                normals[vertices[j]].smoothCount = 0;
            }
            face.vertexNormals[j] = normals[vertices[j]];
        }
    }
    
    this.normalsNeedUpdate = true;
};