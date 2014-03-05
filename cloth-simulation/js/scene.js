function setupScene(parameters) {
    parameters = parameters || {};
    
    parameters.mode = parameters.mode || 'flag';
    
    // World constants
    if (parameters.mode == 'flag') {
        gravity = new THREE.Vector3(0, 0.01, 0);
        air = {
    	    speed: new THREE.Vector3(1, 0.01, 0.01),
    	    density: 1.2,
    	    dragCoeff: 1.2
    	};
    } else if (parameters.mode == 'sheet') {
        gravity = new THREE.Vector3(0, -9.81, 0);
        air = {
    	    speed: new THREE.Vector3(0.5, 0.01, 0.01),
    	    density: 1.2,
    	    dragCoeff: 1.2
    	};
    } else if (parameters.mode == 'hammock') {
        gravity = new THREE.Vector3(0, -9.81, 0);
        air = {
    	    speed: new THREE.Vector3(0.01, 0.01, 0.01),
    	    density: 1.2,
    	    dragCoeff: 1.2
    	};
    }

    scene = new THREE.Scene();
    materials = [];
    spheres = [];

    var planeTexture = THREE.ImageUtils.loadTexture('img/snow.jpg');
    planeTexture.wrapS = planeTexture.wrapT = THREE.RepeatWrapping; 
    planeTexture.repeat.set(30, 30);
	var planeMaterial =  new THREE.MeshPhongMaterial({color:0xffffff, wireframe: false, map: planeTexture});
	materials.push(planeMaterial);
	
	var clothTexture;
	if (parameters.mode == 'flag') {
    	clothTexture = THREE.ImageUtils.loadTexture('img/us-flag.jpg');
	} else if (parameters.mode == 'sheet') {
    	clothTexture = THREE.ImageUtils.loadTexture('img/california-flag.jpg');
	} else {
    	clothTexture = THREE.ImageUtils.loadTexture('img/checkerboard.jpg');
	}
	
	var normalsTexture = THREE.ImageUtils.loadTexture('img/fabric-normals.jpg');    
	var clothMaterial =  new THREE.MeshPhongMaterial({
	    color:0xffffff,
	    wireframe: false,
	    side: THREE.DoubleSide,
	    map: clothTexture,
	    normalMap: normalsTexture,
	    normalScale: new THREE.Vector2(0.1, 0.3),
	    specular: new THREE.Color(0.2, 0.2, 0.2)
	});
	materials.push(clothMaterial);
	
	plane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100, 20, 20), planeMaterial);
	plane.position.y = -5;
	plane.rotation.x = -Math.PI/2;
	plane.bounce = 0.5;
	plane.friction = 0.1;
	
	camera.position.y = 2 + plane.position.y;
	camera.position.z = 6;
	orbitControl.target.y = 2 + plane.position.y;
	
	scene.add(plane);

    // Cloth
	cloth = new Cloth(clothMaterial, camera, scene, {
	    customParticlePos: function(particle, cloth, x, y) {
    	    if (parameters.mode == 'hammock') {
        	     particle.position.set(
                    (x/cloth.subDivsX)*cloth.width - cloth.width/2,
                    0,
                    -(y/cloth.subDivsY)*cloth.height + cloth.height/2
                );
    	    }
	    },
	    attach: function (cloth) {
	        var particle, i;
	        
	        if (parameters.mode == 'flag') {
                for (i = 0; i < cloth.subDivsY; i += 1) {
                    particle = cloth.particles[0*cloth.subDivsY + i];
                    cloth.attachedParticles.push(particle);
                    particle.mass = 0;
                }
            } else if (parameters.mode == 'sheet') {
                for (i = 0; i < cloth.subDivsX; i += 1) {
                    particle = cloth.particles[i*cloth.subDivsY + 0];
                    cloth.attachedParticles.push(particle);
                    particle.mass = 0;
                }
            } else if (parameters.mode == 'hammock') {
                for (i = 0; i < cloth.subDivsY; i += 1) {
                    particle = cloth.particles[0*cloth.subDivsY + i];
                    cloth.attachedParticles.push(particle);
                    particle.mass = 0;
                    particle = cloth.particles[(cloth.subDivsX-1)*cloth.subDivsY + i];
                    cloth.attachedParticles.push(particle);
                    particle.mass = 0;
                }
            }
	    }
	});
	
	scene.add(cloth);	
	
	// Sphere
	var sphere = createSphere(0.5, new THREE.Vector3(0, -4, -0.7));
	sphere.angularVelocity.y = 0.5;
		
    sphereControl = new THREE.TransformControls(camera, renderer.domElement);
	sphereControl.attach(sphere);
	
	// Add flag pole
	poleMaterial = new THREE.MeshPhongMaterial({
	    color: 0xffffff,
	    reflectivity: 0.5,
	    specular: new THREE.Color(0xffffff)
	});
	materials.push(poleMaterial);
	pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 5), poleMaterial);
	pole.position.set(-1, -3.5, 0);
	scene.add(pole);
	var poleHead = new THREE.Mesh(new THREE.SphereGeometry(0.02), poleMaterial);
	poleHead.position.set(-1, -1, 0);
	scene.add(poleHead);
	
	// lights
	light = new THREE.AmbientLight(0x222222);
	scene.add(light);
	
	light = new THREE.PointLight(0xffffff);
	light.position.set(-10, 10, -10);
	light.intensity = 0.5;
	scene.add(light);	
	
	light = new THREE.SpotLight(0xffffff);
	light.position.set(10, 10, 10);
	light.intensity = 1;
	scene.add(light);

    // Shadow maps
    renderer.shadowMapEnabled = true;
    
    light.shadowBias = 0.00001;
	light.shadowDarkness = 0.5;
	
	light.shadowCameraNear = 8;
	light.shadowCameraFar = 50;
	light.shadowMapWidth = 2048;
	light.shadowMapHeight = 2048;
    
    light.castShadow = true;
    sphere.castShadow = true;
    cloth.castShadow = true;
    pole.castShadow = true;
    sphere.receiveShadow = true;
    plane.receiveShadow = true;
	
	initCubemap();
}

function initCubemap() {
    // Cubemap
    var path = "img/cubemaps/Park3Med/";
    var format = '.jpg';
    var urls = [
        path + 'posx' + format, path + 'negx' + format,
        path + 'posy' + format, path + 'negy' + format,
        path + 'posz' + format, path + 'negz' + format
    ];

    var reflectionCube = THREE.ImageUtils.loadTextureCube( urls );
    reflectionCube.format = THREE.RGBFormat;
    
    poleMaterial.envMap = reflectionCube;

	// Skybox
    var shader = THREE.ShaderLib[ "cube" ];
    shader.uniforms[ "tCube" ].value = reflectionCube;

    var material = new THREE.ShaderMaterial( {
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        depthWrite: false,
        side: THREE.BackSide
	});
	materials.push(material);

	var cubemapMesh = new THREE.Mesh(new THREE.BoxGeometry(150, 150, 150), material);
	scene.add(cubemapMesh);
}

var sphereTexture, sphereMaterial;

function createSphere(radius, position) {
    if (!sphereTexture) {
        sphereTexture = THREE.ImageUtils.loadTexture('img/checkerboard.jpg');
        sphereTexture.wrapS = sphereTexture.wrapT = THREE.RepeatWrapping;
    	sphereTexture.repeat.set(3, 3);
    }
    
	if (!sphereMaterial) {
    	sphereMaterial = new THREE.MeshPhongMaterial({color:0xffffff, map: sphereTexture, specular: new THREE.Color(0.3, 0.3, 0.3)});
    	materials.push(sphereMaterial);
	}
		
	var sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 20), sphereMaterial);
	spheres.push(sphere);
	
	sphere.castShadow = true;
	
	sphere.position.copy(position);
	sphere.velocity = new THREE.Vector3();
	sphere.acceleration = new THREE.Vector3();
	sphere.force = new THREE.Vector3();	
	sphere.angularVelocity = new THREE.Vector3(0, 0, 0);
	sphere.mass = 0;
	sphere.bounce = 0;
	sphere.friction = 0.5;
	scene.add(sphere);
	return sphere;
}