type Scenario = {
  speciesProbabilities: Array<number>
  numTrees: number
  declusteringStrength: number
  coppiceMinRadius: number
  coppiceChance: number
  coppiceRadiusSpread: number
  coppiceFoodTrees: boolean
}

type TreeSpecies = {
  id: string
  color: string
  growthRate: number
  maxRadius: number
  shadeTolerance: number // 0 to 1
  lifespan: number
  foodProductivity?: number
}

export type Tree = {
  x: number
  y: number
  radius: number
  speciesId: string
  color: string
  age: number
  stemAge: number
  sizeMultiplier: number
  health: number // 0 to 1
  isDead?: boolean
}

type Run = {
  id: number
  yearlyData: {
    carbon: number[]
    trees: number[]
    biodiversity: number[]
    food: number[]
  }
  trees: Tree[]
  deadTrees: Tree[]
  initialTrees: Tree[]
  scenario: Scenario
  fitness: number
  carbon: number
  averageBiodiversity: number
  food: number
  isAllocated?: boolean
  isComplete?: boolean
}