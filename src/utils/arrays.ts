/*
Copyright 2020, 2021 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * Quickly resample an array to have less/more data points. If an input which is larger
 * than the desired size is provided, it will be downsampled. Similarly, if the input
 * is smaller than the desired size then it will be upsampled.
 * @param {number[]} input The input array to resample.
 * @param {number} points The number of samples to end up with.
 * @returns {number[]} The resampled array.
 */
export function arrayFastResample(input: number[], points: number): number[] {
    if (input.length === points) return input; // short-circuit a complicated call

    // Heavily inspired by matrix-media-repo (used with permission)
    // https://github.com/turt2live/matrix-media-repo/blob/abe72c87d2e29/util/util_audio/fastsample.go#L10
    let samples: number[] = [];
    if (input.length > points) {
        // Danger: this loop can cause out of memory conditions if the input is too small.
        const everyNth = Math.round(input.length / points);
        for (let i = 0; i < input.length; i += everyNth) {
            samples.push(input[i]);
        }
    } else {
        // Smaller inputs mean we have to spread the values over the desired length. We
        // end up overshooting the target length in doing this, but we're not looking to
        // be super accurate so we'll let the sanity trims do their job.
        const spreadFactor = Math.ceil(points / input.length);
        for (const val of input) {
            samples.push(...arraySeed(val, spreadFactor));
        }
    }

    // Sanity fill, just in case
    while (samples.length < points) {
        samples.push(input[input.length - 1]);
    }

    // Sanity trim, just in case
    if (samples.length > points) {
        samples = samples.slice(0, points);
    }

    return samples;
}

/**
 * Creates an array of the given length, seeded with the given value.
 * @param {T} val The value to seed the array with.
 * @param {number} length The length of the array to create.
 * @returns {T[]} The array.
 */
export function arraySeed<T>(val: T, length: number): T[] {
    const a: T[] = [];
    for (let i = 0; i < length; i++) {
        a.push(val);
    }
    return a;
}

/**
 * Trims or fills the array to ensure it meets the desired length. The seed array
 * given is pulled from to fill any missing slots - it is recommended that this be
 * at least `len` long. The resulting array will be exactly `len` long, either
 * trimmed from the source or filled with the some/all of the seed array.
 * @param {T[]} a The array to trim/fill.
 * @param {number} len The length to trim or fill to, as needed.
 * @param {T[]} seed Values to pull from if the array needs filling.
 * @returns {T[]} The resulting array of `len` length.
 */
export function arrayTrimFill<T>(a: T[], len: number, seed: T[]): T[] {
    // Dev note: we do length checks because the spread operator can result in some
    // performance penalties in more critical code paths. As a utility, it should be
    // as fast as possible to not cause a problem for the call stack, no matter how
    // critical that stack is.
    if (a.length === len) return a;
    if (a.length > len) return a.slice(0, len);
    return a.concat(seed.slice(0, len - a.length));
}

/**
 * Clones an array as fast as possible, retaining references of the array's values.
 * @param a The array to clone. Must be defined.
 * @returns A copy of the array.
 */
export function arrayFastClone<T>(a: T[]): T[] {
    return a.slice(0, a.length);
}

/**
 * Determines if the two arrays are different either in length, contents,
 * or order of those contents.
 * @param a The first array. Must be defined.
 * @param b The second array. Must be defined.
 * @returns True if they are different, false otherwise.
 */
export function arrayHasOrderChange(a: any[], b: any[]): boolean {
    if (a.length === b.length) {
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return true;
        }
        return false;
    } else {
        return true; // like arrayHasDiff, a difference in length is a natural change
    }
}

/**
 * Determines if two arrays are different through a shallow comparison.
 * @param a The first array. Must be defined.
 * @param b The second array. Must be defined.
 * @returns True if they are different, false otherwise.
 */
export function arrayHasDiff(a: any[], b: any[]): boolean {
    if (a.length === b.length) {
        // When the lengths are equal, check to see if either array is missing
        // an element from the other.
        if (b.some(i => !a.includes(i))) return true;
        if (a.some(i => !b.includes(i))) return true;

        // if all the keys are common, say so
        return false;
    } else {
        return true; // different lengths means they are naturally diverged
    }
}

/**
 * Performs a diff on two arrays. The result is what is different with the
 * first array (`added` in the returned object means objects in B that aren't
 * in A). Shallow comparisons are used to perform the diff.
 * @param a The first array. Must be defined.
 * @param b The second array. Must be defined.
 * @returns The diff between the arrays.
 */
export function arrayDiff<T>(a: T[], b: T[]): { added: T[], removed: T[] } {
    return {
        added: b.filter(i => !a.includes(i)),
        removed: a.filter(i => !b.includes(i)),
    };
}

/**
 * Returns the union of two arrays.
 * @param a The first array. Must be defined.
 * @param b The second array. Must be defined.
 * @returns The union of the arrays.
 */
export function arrayUnion<T>(a: T[], b: T[]): T[] {
    return a.filter(i => b.includes(i));
}

/**
 * Merges arrays, deduping contents using a Set.
 * @param a The arrays to merge.
 * @returns The merged array.
 */
export function arrayMerge<T>(...a: T[][]): T[] {
    return Array.from(a.reduce((c, v) => {
        v.forEach(i => c.add(i));
        return c;
    }, new Set<T>()));
}

/**
 * Helper functions to perform LINQ-like queries on arrays.
 */
export class ArrayUtil<T> {
    /**
     * Create a new array helper.
     * @param a The array to help. Can be modified in-place.
     */
    constructor(private a: T[]) {
    }

    /**
     * The value of this array, after all appropriate alterations.
     */
    public get value(): T[] {
        return this.a;
    }

    /**
     * Groups an array by keys.
     * @param fn The key-finding function.
     * @returns This.
     */
    public groupBy<K>(fn: (a: T) => K): GroupedArray<K, T> {
        const obj = this.a.reduce((rv: Map<K, T[]>, val: T) => {
            const k = fn(val);
            if (!rv.has(k)) rv.set(k, []);
            rv.get(k).push(val);
            return rv;
        }, new Map<K, T[]>());
        return new GroupedArray(obj);
    }
}

/**
 * Helper functions to perform LINQ-like queries on groups (maps).
 */
export class GroupedArray<K, T> {
    /**
     * Creates a new group helper.
     * @param val The group to help. Can be modified in-place.
     */
    constructor(private val: Map<K, T[]>) {
    }

    /**
     * The value of this group, after all applicable alterations.
     */
    public get value(): Map<K, T[]> {
        return this.val;
    }

    /**
     * Orders the grouping into an array using the provided key order.
     * @param keyOrder The key order.
     * @returns An array helper of the result.
     */
    public orderBy(keyOrder: K[]): ArrayUtil<T> {
        const a: T[] = [];
        for (const k of keyOrder) {
            if (!this.val.has(k)) continue;
            a.push(...this.val.get(k));
        }
        return new ArrayUtil(a);
    }
}
