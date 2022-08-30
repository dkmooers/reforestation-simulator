type Scenario = {
  speciesProbabilities: Array<number>
  numTrees: number
  declusteringStrength: number
}

type TreeSpecies = {
  id: string
  color: string
  growthRate: number
  maxRadius: number
  shadeTolerance: number // 0 to 1
  lifespan: number
}

export type Tree = {
  x: number
  y: number
  radius: number
  speciesId: string
  color: string
  age: number
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
  }
  trees: Tree[]
  deadTrees: Tree[]
  scenario: Scenario
  fitness?: number
  isAllocated?: boolean
  isComplete?: boolean
}