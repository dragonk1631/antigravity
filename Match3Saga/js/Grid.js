class Grid {
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.grid = [];
        this.tileSize = 75;
        this.isProcessing = false; // Locks input when animating/refilling
        this.matches = [];
        this.score = 0; // Initialize score locally, Game class will read it
    }

    // Initialize the grid with no pre-existing matches
    fullFill() {
        this.grid = [];
        for (let c = 0; c < this.cols; c++) {
            this.grid[c] = [];
            for (let r = 0; r < this.rows; r++) {
                let type;
                do {
                    type = Math.floor(Math.random() * 6);
                } while (this.wouldMatch(c, r, type));

                this.grid[c][r] = new Candy(type, c, r);
                // Reset visualY to random height above for spawn animation
                this.grid[c][r].visualY = -Math.random() * 500 - 100;
            }
        }
    }

    // Check if placing a candy of 'type' at (c, r) would create a match
    wouldMatch(c, r, type) {
        if (c >= 2 &&
            this.grid[c - 1][r] && this.grid[c - 1][r].type === type &&
            this.grid[c - 2][r] && this.grid[c - 2][r].type === type) {
            return true;
        }
        if (r >= 2 &&
            this.grid[c][r - 1] && this.grid[c][r - 1].type === type &&
            this.grid[c][r - 2] && this.grid[c][r - 2].type === type) {
            return true;
        }
        return false;
    }

    get(c, r) {
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return null;
        return this.grid[c][r];
    }

    // Attempt to swap two candies
    swap(c1, r1, c2, r2, callback) {
        const can1 = this.get(c1, r1);
        const can2 = this.get(c2, r2);

        if (!can1 || !can2 || this.isProcessing) return;

        // Perform Swap
        this.grid[c1][r1] = can2;
        this.grid[c2][r2] = can1;
        can1.setPos(c2, r2);
        can2.setPos(c1, r1);

        this.isProcessing = true;

        // Wait for swap animation to finish roughly
        setTimeout(() => {
            const matches = this.findMatches();
            if (matches.length > 0) {
                // Valid swap
                this.processMatches(matches, callback);
            } else {
                // Invalid swap, revert
                this.grid[c1][r1] = can1;
                this.grid[c2][r2] = can2;
                can1.setPos(c1, r1);
                can2.setPos(c2, r2);
                this.isProcessing = false;
            }
        }, 300);
    }

    findMatches() {
        let matched = [];
        let visited = new Set();

        // Horizontal Matches
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols - 2; c++) {
                let type = this.grid[c][r].type;
                let matchLen = 1;
                while (c + matchLen < this.cols && this.grid[c + matchLen][r].type === type) {
                    matchLen++;
                }

                if (matchLen >= 3) {
                    for (let i = 0; i < matchLen; i++) {
                        let key = `${c + i},${r}`;
                        matched.push(this.grid[c + i][r]);
                    }
                    c += matchLen - 1;
                }
            }
        }

        // Vertical Matches
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows - 2; r++) {
                let type = this.grid[c][r].type;
                let matchLen = 1;
                while (r + matchLen < this.rows && this.grid[c][r + matchLen].type === type) {
                    matchLen++;
                }

                if (matchLen >= 3) {
                    for (let i = 0; i < matchLen; i++) {
                        matched.push(this.grid[c][r + i]);
                    }
                    r += matchLen - 1;
                }
            }
        }

        // Remove duplicates
        return [...new Set(matched)];
    }

    processMatches(matches, callback) {
        if (matches.length === 0) {
            this.isProcessing = false;
            return;
        }

        // Mark as matched
        let uniqueMatches = [...new Set(matches)]; // Ensure unique
        this.score += uniqueMatches.length * 10;

        uniqueMatches.forEach(candy => {
            candy.state = 'MATCHED';
        });

        // Callback for score update or audio
        if (callback) callback('MATCH', { count: uniqueMatches.length, matches: uniqueMatches });

        // Wait for pop animation
        setTimeout(() => {
            this.removeMatches(uniqueMatches);
            this.applyGravity();
            this.refill();

            // Wait for fall and check again
            setTimeout(() => {
                const nextMatches = this.findMatches();
                if (nextMatches.length > 0) {
                    this.processMatches(nextMatches, callback); // Chain reaction
                } else {
                    this.isProcessing = false;
                }
            }, 600);
        }, 300);
    }

    removeMatches(matches) {
        matches.forEach(candy => {
            if (this.grid[candy.col][candy.row] === candy) {
                this.grid[candy.col][candy.row] = null;
            }
        });
    }

    applyGravity() {
        for (let c = 0; c < this.cols; c++) {
            let emptySlots = 0;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.grid[c][r] === null) {
                    emptySlots++;
                } else if (emptySlots > 0) {
                    // Move candy down
                    const candy = this.grid[c][r];
                    const newRow = r + emptySlots;
                    this.grid[c][newRow] = candy;
                    this.grid[c][r] = null;
                    candy.setPos(c, newRow);
                }
            }
        }
    }

    refill() {
        for (let c = 0; c < this.cols; c++) {
            let r = 0;
            // Find first empty spot from bottom? No, simpler to find empty spots from top down
            // But gravity pushed everything down, so empty spots are at the top.
            for (let r = 0; r < this.rows; r++) {
                if (this.grid[c][r] === null) {
                    const type = Math.floor(Math.random() * 6);
                    const candy = new Candy(type, c, r);
                    candy.visualY = -75 * (this.rows - r); // Spawn above
                    this.grid[c][r] = candy;
                }
            }
        }
    }

    update(dt) {
        let allIdle = true;
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                if (this.grid[c][r]) {
                    this.grid[c][r].update(dt);
                    if (this.grid[c][r].state !== 'IDLE') {
                        allIdle = false;
                    }
                }
            }
        }

        // Safety check: if input is locked but everything is idle for a while, unlock
        // (Not implemented for simplicity, relying on timeouts)
    }

    draw(ctx, offsetX, offsetY) {
        // Draw bottom to top, so falling candies appear over others properly? 
        // Order matters for overlap. generally low row index (top) drawn first?
        // Actually, lower Y (top) drawn first means higher Y (bottom) overlaps.
        for (let c = 0; c < this.cols; c++) {
            for (let r = 0; r < this.rows; r++) {
                if (this.grid[c][r]) {
                    this.grid[c][r].draw(ctx, offsetX, offsetY);
                }
            }
        }
    }
}
