// Put renderer and scene in global scope, in order to access it through the console
var renderer = new Renderer();
var scene = new Scene();;

(function() {

    var stats;

    // Load shader sources
    $.get('shaders/vertex.glsl', function (vertexSource) {
        $.get('shaders/fragment.glsl', function (fragmentSource) {
            renderer.setShaderSource(vertexSource, fragmentSource);
            init();
        });
    });

    function init() {
        $('#canvas-view').html(renderer.canvas);
        renderer.setSize([800, 450]);

        scene.setMaxPathLength(3);

        // Add a flycam
        scene.setCamera(new Flycam(renderer, [0, 3, 12], [16, 9], [0, 1, 0]));

        testScene(scene);
        //cornelBox(scene);

        renderer.setScene(scene);
        renderer.update();

        // Stats
        stats = new Stats();
        stats.setMode(0); // 0: fps, 1: ms
        // Align top-left
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        document.body.appendChild(stats.domElement);

        loop();
    }
	
	function loop() {
	    window.requestAnimationFrame(loop);	   	    
	    
	    stats.begin();
	    
	    // Update scene
	    if (scene.camera.update)
	    	if (scene.camera.update())
	    		renderer.reset();
	    
	    // Render
	    renderer.render();
	    
	    // Update stats
	    $('#view-stats').html('Rendered samples: ' + renderer.sampleCount);
	    stats.end();	    
    }
    
    // Scenes
    function testScene(scene) {
		scene.setBackgroundColor([0, 0, 0]);
		
		var planeMaterial = new Material([1, 1, 1]);
		var objectMaterial = new Material([1, 0, 0]);

//		scene.addObject(Cube.withCenter([-2, 1, 0], 2, objectMaterial));
//		scene.addObject(new Sphere([-2, 3, 0], 1, objectMaterial));
//		scene.addObject(new Sphere([2, 1, 0], 1, objectMaterial));
		scene.addObject(new Sphere([0, 2, 0], 2, objectMaterial));
        //scene.addObject(new Parallelogram([-1, 5, 0], [2, 0, 0], [0, 0, 2], objectMaterial));
		scene.addObject(new Plane([0, 0, 0], [0, 1, 0], planeMaterial));

        scene.addLight(new AreaLight([-1, 5, -2], [2, 0, 0], [0, 2, 0], [1, 1, 1], 200));
		//scene.addLight(new PointLight([0, 10, 5], [1, 1, 1], 200));
			
		return scene;	
    }
    
	function cornelBox(scene) {
		
		scene.setRenderLights(false);
		
		var planeMaterial = new Material([1, 1, 1]);
		var objectMaterial = new Material([1, 1, 1]);
		objectMaterial.setReflection(1);
		objectMaterial.setGlossiness(0.2);		
		
		scene.addObject(Cube.withCenter([-2, 1, 0], 2, objectMaterial));
		scene.addObject(new Sphere([-2, 3, 0], 1, objectMaterial));
		scene.addObject(new Sphere([2, 1, 0], 1, objectMaterial));
		scene.addObject(new Sphere([0, 1, 0], 1, objectMaterial));
		scene.addObject(new Plane([0, 0, 0], [0, 1, 0], planeMaterial));
		scene.addObject(new Plane([0, 0, -5], [0, 0, 1], planeMaterial));
		scene.addObject(new Plane([-5, 0, 0], [1, 0, 0], new Material([0, 1, 0])));
		scene.addObject(new Plane([5, 0, 0], [-1, 0, 0], new Material([1, 0, 0])));
		scene.addObject(new Plane([0, 6, 0], [0, -1, 0], planeMaterial));
		scene.addObject(new Plane([0, 0, 10], [0, 0, -1], planeMaterial));
			
		scene.addLight(new Light([3, 3, 5], 5, [1, 1, 1]));		
		
		return scene;
	}    
}());