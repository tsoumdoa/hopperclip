import { expect, test } from "vitest";
import {
	addEvent,
	HALF_LIFE_MS,
	logAddExp,
	T0,
	TAU_MS,
	weights,
} from "./ranking";

test("log addition stays stable across large gaps", () => {
	expect(logAddExp(1000, -1000)).toBe(1000);
	expect(logAddExp(undefined, 1000)).toBe(1000);
	expect(Number.isFinite(logAddExp(1000, 1000))).toBe(true);
});

test("heat ordering matches independent decayed event scores", () => {
	const histories = [
		[
			{ weight: weights.created, at: T0 },
			...Array.from({ length: 8 }, () => ({
				weight: weights.copy,
				at: T0 + HALF_LIFE_MS,
			})),
		],
		[{ weight: weights.created, at: T0 + 2 * HALF_LIFE_MS }],
		[
			{ weight: weights.created, at: T0 + HALF_LIFE_MS },
			{ weight: weights.modified, at: T0 + 2 * HALF_LIFE_MS },
		],
	];
	const heats = histories.map((events) =>
		events.reduce<number | undefined>(
			(heat, event) => addEvent(heat, event.weight, event.at),
			undefined
		)!
	);
	const byHeat = histories.map((_, i) => i).sort((a, b) => heats[b] - heats[a]);
	expect(byHeat[0]).toBe(0);
	expect(TAU_MS).toBe(HALF_LIFE_MS / Math.LN2);
	for (const now of [T0 + 2 * HALF_LIFE_MS, T0 + 10 * HALF_LIFE_MS]) {
		const scores = histories.map((events) =>
			events.reduce(
				(sum, event) =>
					sum + event.weight * 2 ** (-(now - event.at) / HALF_LIFE_MS),
				0
			)
		);
		const byScore = histories
			.map((_, i) => i)
			.sort((a, b) => scores[b] - scores[a]);
		expect(byHeat).toEqual(byScore);
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
