export default class AudioScheduler {
    constructor(audioContext, onTick) {
        this.ctx = audioContext;
        this.onTick = onTick; // Callback to schedule notes
        this.nextNoteTime = 0;
        this.isRunning = false;
        this.timerID = null;
        this.lookAhead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // seconds
    }

    start() {
        if (this.isRunning) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        this.isRunning = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.timerID = window.setInterval(() => this.scheduler(), this.lookAhead);
    }

    stop() {
        this.isRunning = false;
        window.clearInterval(this.timerID);
    }

    scheduler() {
        // While there are notes that will need to play before the next interval,
        // schedule them and advance the pointer.
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.onTick(this.nextNoteTime);
            // Logic to advance nextNoteTime would happen in onTick or here, 
            // but for a generic scheduler, we might just trigger the callback 
            // and let the caller decide the next time, or we just tick consistently.
            // For this specific game where BPM changes per level, we'll let the GameScene manage the logic 
            // of "what is the next note time" via the onTick, OR we make this class simpler:
            // Actually, best practice: This class just wakes up. The GameScene checks its queue.
            // But to follow the "metronome" pattern:

            // Refedinition: This particular scheduler usually manages the abstract "tick".
            // Since we have complex patterns (polyrhythm), 
            // we will use this simply to trigger a 'processQueue' method in GameScene.
            break; // We perform this loop inside the GameScene actually.
        }
        // Correction: The Interval just wakes us up. The logic is:
        this.onTick(this.scheduleAheadTime);
    }
}
// Revised Approach for simplicty:
// We will just expose a start/stop wrapper around setInterval that calls the game loop's updateAudio logic.
