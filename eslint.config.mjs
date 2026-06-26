import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			".next/**",
			".output/**",
			"convex/_generated/**",
			"src/routeTree.gen.ts",
		],
	},
	{
		files: ["**/*.{ts,tsx,js,jsx}"],
		languageOptions: {
			parser: tseslint.parser,
			ecmaVersion: "latest",
			sourceType: "module",
		},
		plugins: {
			"@typescript-eslint": tseslint.plugin,
		},
		rules: {
			"@typescript-eslint/ban-ts-comment": "off",
		},
	},
];

export default eslintConfig;
