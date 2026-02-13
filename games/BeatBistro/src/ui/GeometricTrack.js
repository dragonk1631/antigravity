
import { COLORS } from '../consts.js';

export default class GeometricTrack {
    constructor(scene, x, y, size, sides, color, durationPerLoop) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.size = size; // Radius or Length
        this.sides = sides; // 2=Line, 3=Tri, 4=Square
        this.color = parseInt(color.replace('#', '0x'));
        this.duration = durationPerLoop; // Seconds for one full loop (Bar duration)

        this.vertices = [];
        this.container = scene.add.container(x, y);

        this.createShape();
        this.createCursor();
    }

    createShape() {
        // Draw the static path
        this.graphics = this.scene.add.graphics();
        this.graphics.lineStyle(6, this.color, 1); // Thicker line for neon
        this.container.add(this.graphics);

        // Apply Glow FX (Neon)
        if (this.graphics.postFX) {
            this.graphics.postFX.addGlow(this.color, 4, 0.8);
        }

        // Generate Vertices
        // 2 Sides = Line
        if (this.sides === 2) {
            // Line from Left to Right
            // -Size to +Size
            const p1 = { x: -this.size, y: 0 };
            const p2 = { x: this.size, y: 0 };
            this.vertices = [p1, p2];

            this.graphics.beginPath();
            this.graphics.moveTo(p1.x, p1.y);
            this.graphics.lineTo(p2.x, p2.y);
            this.graphics.strokePath();

            // Visualize Vertices
            this.addVertexMarker(p1.x, p1.y);
            this.addVertexMarker(p2.x, p2.y);
        }
        else {
            // Polygon
            const angleStep = (Math.PI * 2) / this.sides;
            // Tripangle starts at top (-90 deg)
            const startAngle = -Math.PI / 2;

            this.graphics.beginPath();
            for (let i = 0; i < this.sides; i++) {
                const angle = startAngle + (i * angleStep);
                const vx = Math.cos(angle) * this.size;
                const vy = Math.sin(angle) * this.size;
                this.vertices.push({ x: vx, y: vy });

                if (i === 0) this.graphics.moveTo(vx, vy);
                else this.graphics.lineTo(vx, vy);

                this.addVertexMarker(vx, vy);
            }
            this.graphics.closePath();
            this.graphics.strokePath();
        }
    }

    addVertexMarker(x, y) {
        // Neon Vertex Node
        const marker = this.scene.add.circle(x, y, 6, 0xffffff);
        marker.setStrokeStyle(2, this.color);
        this.container.add(marker);

        if (marker.postFX) {
            marker.postFX.addGlow(this.color, 2, 0.5);
        }

        // Store visual reference in vertex data if needed for effects
        const vIndex = this.vertices.findIndex(v => v.x === x && v.y === y);
        if (vIndex >= 0) this.vertices[vIndex].visual = marker;
    }

    createCursor() {
        this.cursor = this.scene.add.circle(0, 0, 8, 0xffffff);
        this.container.add(this.cursor);

        // Bright Glow for Cursor
        if (this.cursor.postFX) {
            this.cursor.postFX.addGlow(0xffffff, 2, 2);
        }

        // Trail effect
        this.cursorTrail = this.scene.add.particles(0, 0, 'particle', {
            lifespan: 300,
            scale: { start: 0.6, end: 0 },
            alpha: { start: 0.6, end: 0 },
            speed: 0,
            tint: this.color,
            follow: this.cursor,
            blendMode: 'ADD'
        });
        this.container.add(this.cursorTrail);
    }

    update(currentTime) {
        // Calculate progress in loop (0 to 1)
        const duration = this.duration;
        let t = (currentTime % duration) / duration;

        if (t < 0) t += 1;

        // Map t to position
        const mappedPos = this.getPositionAtProgress(t);
        this.cursor.setPosition(mappedPos.x, mappedPos.y);

        // Detect Vertex Crossing
        // We compare lastT with current t.
        // Vertices are at k / sides.
        if (typeof this.lastT === 'undefined') {
            this.lastT = t;
            return null;
        }

        let hitIndices = [];

        // Check for wrap-around
        if (t < this.lastT) {
            // Check [lastT, 1.0) and [0.0, t]
            this.checkCrossing(this.lastT, 1.0, hitIndices);
            this.checkCrossing(0.0, t, hitIndices);
        } else {
            this.checkCrossing(this.lastT, t, hitIndices);
        }

        this.lastT = t;
        return hitIndices;
    }

    checkCrossing(t1, t2, indices) {
        if (this.sides === 2) {
            // Ping Pong Logic: Vertices at 0.0 and 0.5
            // Check 0.5 crossing
            if (t1 < 0.5 && t2 >= 0.5) indices.push(1);
            // Check 0.0 (Wrap) is handled by update calls (checkCrossing(lastT, 1) and checkCrossing(0, t))
            // If t2 == 1, it implies 1.0 crossing? 
            // Actually, 0.0 is usually hit on wrap.
        } else {
            // Polygon: Vertices at k/sides
            for (let i = 0; i < this.sides; i++) {
                const vt = i / this.sides;
                // If vt is 0, we only trigger if we cover the start interval (0, t] OR wrapping hits it.
                // Simple range check: t1 < vt && vt <= t2
                if (t1 < vt && vt <= t2) indices.push(i);
            }
        }
    }

    getPositionAtProgress(t) {
        // t is 0..1
        // We have N segments.
        // Segments are between vertices.
        // 2 sides (Line): 
        //   Special Logic: 2 beats per bar.
        //   If "Loop", maybe it goes A -> B -> A? No, that's 2 segments in one cycle. 
        //   If 2 beats: Beat 1 at A, Beat 2 at B.
        //   Linear Interpolation: 0.0 -> A, 0.5 -> B, 1.0 -> A (Wrap around? No, Line is usually bounce)
        //   Or just unidirectional: A -> B (Beat 1, 2). Then jump back? No visual discontinuity.
        //   Standard "2:3 Polyrhythm" visual is usually a Circle vs Line.
        //   Line goes Left->Right (1, 2) then Right->Left (3, 4)?
        //   Let's implement "Ping Pong" for Line? 
        //   If sides=2, duration covers 2 beats.
        //   t=0 (Beat 1) at P1. t=0.5 (Beat 2) at P2. t=1 (Beat 3/1) at P1.
        //   Segments: P1->P2 (0 to 0.5), P2->P1 (0.5 to 1.0).

        if (this.sides === 2) {
            // Ping Pong
            // Safety check for vertices
            if (this.vertices.length < 2) return { x: 0, y: 0 };

            if (t < 0.5) {
                // P1 -> P2
                const localT = t / 0.5; // 0..1
                return this.lerp(this.vertices[0], this.vertices[1], localT);
            } else {
                // P2 -> P1
                const localT = (t - 0.5) / 0.5; // 0..1
                return this.lerp(this.vertices[1], this.vertices[0], localT);
            }
        }
        else {
            if (this.vertices.length < this.sides) return { x: 0, y: 0 };

            // Polygon Loop
            // P0 -> P1 -> P2 ... -> P0
            let index = Math.floor(t * this.sides);
            // Safety clamp index to valid range [0, length-1]
            if (index >= this.sides) index = 0;

            const segmentT = (t * this.sides) % 1;

            const pStart = this.vertices[index];
            const pEnd = this.vertices[(index + 1) % this.sides];

            if (!pStart || !pEnd) return { x: 0, y: 0 };

            return this.lerp(pStart, pEnd, segmentT);
        }
    }

    lerp(p1, p2, t) {
        return {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t
        };
    }

    // Checking Hit
    // Returns { result: 'PERFECT'|'GOOD'|'MISS'|null, diff: ms, vertexIndex: i }
    checkHit(currentTime) {
        // Expected Target Times
        // We check if we are close to ANY vertex time.
        // Time % Duration = phaseTime.
        // Vertices intersect at phaseTime = 0, 0.5 (Line) or 0, 0.33, 0.66 (Tri).

        const phaseTime = currentTime % this.duration;
        const progress = phaseTime / this.duration; // 0..1

        // Find closest vertex beat
        // For Line (Ping Pong): Beats at 0.0 and 0.5.
        // For Poly: Beats at 0/N, 1/N ...

        let closestBeatT = -1;
        let minDiffT = 1.0;
        let vertexIdx = -1;

        if (this.sides === 2) {
            // Beats at 0.0 and 0.5
            // But strict ping pong:
            // 0.0 is V0. 0.5 is V1. 1.0 is V0.
            const targets = [0.0, 0.5, 1.0]; // 1.0 is alias of 0.0 for next loop

            targets.forEach((target, i) => {
                const diff = Math.abs(progress - target);
                if (diff < minDiffT) {
                    minDiffT = diff;
                    closestBeatT = target;
                    // Map i to vertex: 0->V0, 1->V1, 2->V0
                    vertexIdx = i === 1 ? 1 : 0;
                }
            });
        }
        else {
            // Beats at k/N
            for (let i = 0; i <= this.sides; i++) {
                const target = i / this.sides;
                const diff = Math.abs(progress - target);
                if (diff < minDiffT) {
                    minDiffT = diff;
                    closestBeatT = target;
                    vertexIdx = i % this.sides;
                }
            }
        }

        // Convert DiffT to Seconds
        const diffSeconds = minDiffT * this.duration;

        // Judge Window (Simple logic here, mostly handled by ScoreManager but we provide Diff)
        // 0.1s tolerance
        if (diffSeconds < 0.15) {
            // Return visual confirmation or just data
            return {
                diff: diffSeconds, // Or signed?
                vertexIndex: vertexIdx
            };
        }
        return null;
    }

    pulseVertex(index) {
        if (this.vertices[index] && this.vertices[index].visual) {
            const v = this.vertices[index].visual;

            // Pulse Animation
            this.scene.tweens.add({
                targets: v,
                scale: 2.0,
                duration: 50,
                yoyo: true
            });

            // Particle Explosion
            const emitter = this.scene.add.particles(0, 0, 'particle', {
                x: this.x + v.x,
                y: this.y + v.y,
                speed: { min: 50, max: 150 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.5, end: 0 },
                alpha: { start: 1, end: 0 },
                lifespan: 400,
                quantity: 10,
                tint: this.color,
                blendMode: 'ADD',
                emitting: false
            });
            emitter.explode(10);

            // Cleanup emitter after explosion
            this.scene.time.delayedCall(1000, () => emitter.destroy());
        }
    }
}
