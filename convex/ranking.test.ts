import { expect, test } from "vitest";
import { addEvent, HALF_LIFE_MS, logAddExp, T0, weights } from "./ranking";

test("log addition stays stable across large gaps", () => {
	expect(logAddExp(1000, -1000)).toBe(1000);
	expect(logAddExp(undefined, 1000)).toBe(1000);
	expect(Number.isFinite(logAddExp(1000, 1000))).toBe(true);
});

test("heat ordering matches decayed scores at different evaluation times", () => {
	const a = addEvent(
		addEvent(undefined, weights.created, T0),
		weights.copy,
		T0 + HALF_LIFE_MS
	);
	const b = addEvent(undefined, weights.created, T0 + HALF_LIFE_MS);
	for (const now of [T0 + HALF_LIFE_MS, T0 + 10 * HALF_LIFE_MS]) {
		const decay = (heat: number) =>
			Math.exp(heat - (now - T0) / (HALF_LIFE_MS / Math.LN2));
		expect(Math.sign(a - b)).toBe(Math.sign(decay(a) - decay(b)));
	}
});

test("two copies one half-life ago equal one copy now", () => {
	const now = T0 + HALF_LIFE_MS;
	const old = addEvent(
		addEvent(undefined, 1, now - HALF_LIFE_MS),
		1,
		now - HALF_LIFE_MS
	);
	expect(Math.abs(old - addEvent(undefined, 1, now))).toBeLessThan(1e-9);
});
