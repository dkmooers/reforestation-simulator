export const prettifyNumber = (count: number) => {
  let output = String(count)
  if (count > 1e9) {
    output = `${(count / 1e9).toFixed(1)}B`
  } else if (count > 1e6) {
    output = `${(count / 1e6).toFixed(1)}M`
  } else if (count > 1e3) {
    const length = String(count).length
    const cutoff = 5 - length
    output = `${String(count).slice(0, cutoff)},${String(count).slice(cutoff,)}`
    // output = `${(String(count).slice(String(count).length - 3))},`
    // output = `${(count / 1e3).toFixed(1)}k`
  }
  return output
}