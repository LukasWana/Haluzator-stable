import * as THREE from 'three';

export const generateModelPreview = (
    name: string,
    geometry: any, // THREE.BufferGeometry
    onPreviewGenerated: (key: string, dataUrl: string) => void
) => {
    // Generate preview in a non-blocking way
    setTimeout(() => {
        try {
            const width = 128;
            const height = 128;

            const scene = new THREE.Scene();
            scene.background = new THREE.Color(0x1a1a1a);

            const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
            camera.position.z = 2.5;

            const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
            scene.add(ambientLight);
            const pointLight = new THREE.PointLight(0xffffff, 2.5);
            pointLight.position.set(2, 3, 4);
            scene.add(pointLight);

            const material = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5, metalness: 0.2 });
            const mesh = new THREE.Mesh(geometry, material);

            // Auto-center and scale model
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.y, size.z);
            const scale = 1.5 / maxSize;

            mesh.scale.set(scale, scale, scale);
            mesh.position.sub(center.multiplyScalar(scale));
            
            scene.add(mesh);

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
            renderer.setSize(width, height);
            
            mesh.rotation.x = 0.4;
            mesh.rotation.y = 0.5;
            renderer.render(scene, camera);
            
            const dataUrl = renderer.domElement.toDataURL('image/webp', 0.8);
            onPreviewGenerated(name, dataUrl);
            
            renderer.dispose();
            renderer.forceContextLoss();

        } catch (e) {
            console.error(`Model Preview Gen: Error generating preview for ${name}`, e);
        }
    }, 16);
};