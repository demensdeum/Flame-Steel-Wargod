class MathUtils {
    // Ray-Box intersection test using slab method
    static rayBoxIntersection(rayOrigin, rayDirection, boxCenter, boxSize) {
        // Calculate box bounds
        const minBounds = {
            x: boxCenter.x - boxSize.width / 2,
            y: boxCenter.y - boxSize.height / 2,
            z: boxCenter.z - boxSize.depth / 2
        };
        const maxBounds = {
            x: boxCenter.x + boxSize.width / 2,
            y: boxCenter.y + boxSize.height / 2,
            z: boxCenter.z + boxSize.depth / 2
        };

        // Check for division by zero
        const dirFrac = {
            x: 1.0 / (Math.abs(rayDirection.x) < 1e-8 ? 1e-8 : rayDirection.x),
            y: 1.0 / (Math.abs(rayDirection.y) < 1e-8 ? 1e-8 : rayDirection.y),
            z: 1.0 / (Math.abs(rayDirection.z) < 1e-8 ? 1e-8 : rayDirection.z)
        };

        // Calculate intersection distances
        const t1 = (minBounds.x - rayOrigin.x) * dirFrac.x;
        const t2 = (maxBounds.x - rayOrigin.x) * dirFrac.x;
        const t3 = (minBounds.y - rayOrigin.y) * dirFrac.y;
        const t4 = (maxBounds.y - rayOrigin.y) * dirFrac.y;
        const t5 = (minBounds.z - rayOrigin.z) * dirFrac.z;
        const t6 = (maxBounds.z - rayOrigin.z) * dirFrac.z;

        const tmin = Math.max(Math.max(Math.min(t1, t2), Math.min(t3, t4)), Math.min(t5, t6));
        const tmax = Math.min(Math.min(Math.max(t1, t2), Math.max(t3, t4)), Math.max(t5, t6));

        // Ray is going away from box or doesn't intersect
        if (tmax < 0 || tmin > tmax) {
            return false;
        }

        return true;
    }
    // Convert quaternion to forward vector
    static quaternionToForward(q) {
        // Forward vector is (0, 0, 1) rotated by quaternion
        const x = 2 * (q.x * q.z + q.w * q.y);
        const y = 2 * (q.y * q.z - q.w * q.x);
        const z = 1 - 2 * (q.x * q.x + q.y * q.y);
        
        return { x, y, z };
    }

    // Get direction vector between two positions
    static getDirection(from, to) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dz = to.z - from.z;
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (length === 0) return { x: 0, y: 0, z: 1 };
        
        return {
            x: dx / length,
            y: dy / length,
            z: dz / length
        };
    }

    // Calculate dot product of two vectors
    static dotProduct(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }
}

module.exports = MathUtils;
