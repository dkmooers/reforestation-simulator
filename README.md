# Reforestation Simulator

A reforestation simulator that uses a genetic algorithm to try to find reforestation scenarios that maximize both carbon sequestration *and* biodiversity.

### **[Live Demo](https://reforestationsimulator.netlify.app/)**

Uses multithreading via web workers.

Built with SvelteKit, Tailwind, and TypeScript.

This is a frontend dev portfolio project by [Devin Mooers](https://devinmooers.com)

## Genetic Algorithm Overview

Here's the basic process the algorithm goes through:

- Creates 20 individual scenarios with a random percentage mix of tree species, and random selective harvesting parameters (selective harvesting can be disabled via UI toggle)
- Attempts to plants up to 200 trees on 1 acre of land for each scenario (though it will usually plant fewer than that because the declustering algorithm, based on final canopy size, doesn't generally allow 200 trees to be placed on 1 acre)
- Runs 100 years of tree growth by simulating seed propagation and calculating the sunlight available to each tree
- At each year step, kills trees that have severely degraded health due to being constantly restricted of sunlight for a string of years (relative to their shade tolerance), and adds their embodied carbon to the sequestered carbon bank for that run (assuming composting / fungal breakdown, rather than e.g. burning)
- At each year step, selectively harvests trees according to selective harvesting parameters for that scenario (if selective harvesting module is enabled)
- After 100 years of simulation, evalutes the fitness of each scenario by multiplying together carbon sequestration and biodiversity
- Preserves 2 elites with the highest fitness to move to the next generation
- Selects the remaining 18 individuals for the next generation using mutation and crossover. For crossover, it chooses parents preferentially from higher-fitness individuals, with an exponentially decreasing but nonzero chance of choosing lower-fitness individuals. Mutation is applied to crossover individuals, and the rate is aggressively high to try to prevent getting stuck in local optima (but perhaps too high? hyperparameter tuning could shed light on this).

## Controls

If you disable multithreading via the UI toggle, you can run the app in single-worker mode, during which you'll be able to see year-by-year tree growth updates, rather than just the final result of 100 years of tree growth for each scenario.

## Tree Species

This app uses 6 Northeastern US tree species for prototyping. Tree species data, found in `src/lib/treeSpecies.ts`, including growth rate, shade tolerance, and maximum canopy spread, are loosely based on reality. Canopy spread is the most physically accurate number, but the other values are mainly ad-hoc for prototyping purposes.

## Modifying Parameters

The main genetic algorithm, run orchestration logic, and hyperparamters are contained in `src/lib/simulator.ts`, including things like the number of worker threads, population size, years per run, generations per run, etc. Many constants can be changed there, including the random ranges of parameters used to create the first generation of scenarios.

The tree growth simulation parameters, including growth rate, seed density, etc., can be modified in `src/lib/simulation.worker.ts`.

## Developing

Once you've installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.
