import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

export class AssetManager {
    constructor() {
        this.loader = new GLTFLoader();
        this.assets = {}; // Loaded assets cache { key: gltf }
    }

    loadAssets(assetList) {
        // assetList = [{ key: 'player', url: '...' }, ...]
        const promises = assetList.map(asset => {
            return new Promise((resolve, reject) => {
                this.loader.load(
                    asset.url,
                    (gltf) => {
                        console.log(`Loaded asset: ${asset.key}`);

                        // Enable shadows for all meshes in the model
                        gltf.scene.traverse((child) => {
                            if (child.isMesh) {
                                child.castShadow = true;
                                child.receiveShadow = true;
                            }
                        });

                        this.assets[asset.key] = gltf;
                        resolve(gltf);
                    },
                    (xhr) => {
                        // Progress (optional)
                    },
                    (error) => {
                        console.error(`Error loading asset: ${asset.key}`, error);
                        reject(error);
                    }
                );
            });
        });

        return Promise.all(promises);
    }

    get(key) {
        return this.assets[key];
    }

    // Helper to clone a model - USE SkeletonUtils for skinned meshes!
    clone(key) {
        const original = this.assets[key];
        if (!original) return null;

        // SkeletonUtils.clone properly handles skinned meshes with skeletons
        const clone = SkeletonUtils.clone(original.scene);

        return {
            scene: clone,
            animations: original.animations
        };
    }
}
