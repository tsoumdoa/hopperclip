/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			".output/**",
			"convex/_generated/**",
			"src/routeTree.gen.ts",
		],
	},
	{
		files: ["**/*.{ts,tsx,js,jsx}"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
		},
		rules: {
			"@typescript-eslint/ban-ts-comment": "off",
		},
	},
];

export default eslintConfig;
