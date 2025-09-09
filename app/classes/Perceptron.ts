type Scaler = { mins: number[]; maxs: number[] }

// multiply the feature values by the answer values
function dotProduct(x: number[], y: number[]) {
  let res = 0
  for (let i = 0; i < x.length; i++) {
    res += x[i] * y[i]
  }
  return res
}

function applyBias(x: number[]) {
  return [1, ...x]
}

// binary output
function stepActivation(x: number) {
  return x >= 0 ? 1 : 0
}

// find the min and max ranges
function findMinMax(x: number[][]): Scaler {
  const len = x[0].length
  let mins = Array(len).fill(Number.POSITIVE_INFINITY)
  let maxs = Array(len).fill(Number.NEGATIVE_INFINITY)

  for (const row of x) {
    for (let j = 0; j < len; j++) {
      if (row[j] < mins[j]) mins[j] = row[j]
      if (row[j] > maxs[j]) maxs[j] = row[j]
    }
  }

  return { mins, maxs }
}

// normalize scales for features so they're all the same
function useMinMaxScale(x: number[][], s: Scaler): number[][] {
  return x.map(row =>
    row.map((value, idx) => {
      const range = s.maxs[idx] - s.mins[idx]
      return range === 0 ? 0 : (value - s.mins[idx]) / range
    })
  )
}

type ConfMat = [[number, number], [number, number]] // [[tn, fp], [fn, tp]]

type EvalDetails = {
  accuracy: number
  confusionMatrix: ConfMat
  yhat: (0 | 1)[]
  correct: boolean[]
}

type TrainStepTelemetry = {
  epoch: number
  step: number        // global update counter
  exampleIndex: number
  error: -1 | 0 | 1
  trainAccuracy: number
  testAccuracy?: number
  weightsSnapshot?: number[] // optional: include to visualize boundary over time
}

class Perceptron {
  epochs = 0                // epochs actually run
  learningRate = 0.01       // alpha
  w: number[] = []          // weights (bias first)
  scaler: Scaler | null = null

  // training/test summaries for quick UI access
  lastTrainAccuracy = 0
  lastTestAccuracy = 0

  // best model tracking (by test accuracy if test set provided, else by train)
  bestScore = 0
  bestWeights: number[] | null = null

  // telemetry across training
  telemetry: TrainStepTelemetry[] = []

  // ---- helpers -------------------------------------------------------------

  private predictRowNormalized(row: number[]): 0 | 1 {
    return stepActivation(dotProduct(this.w, applyBias(row)))
  }

  private evaluateNormalized(X: number[][], y: number[]): EvalDetails {
    const yhat = X.map(r => this.predictRowNormalized(r))
    let tp = 0, tn = 0, fp = 0, fn = 0
    const correct = yhat.map((p, i) => {
      const c = p === y[i]
      if (p === 1 && y[i] === 1) tp++
      else if (p === 0 && y[i] === 0) tn++
      else if (p === 1 && y[i] === 0) fp++
      else fn++
      return c
    })
    const accuracy = (tp + tn) / y.length
    const confusionMatrix: ConfMat = [[tn, fp], [fn, tp]]
    return { accuracy, confusionMatrix, yhat, correct }
  }

  // ---- public API ----------------------------------------------------------

  /**
   * Train using perceptron update rule.
   * - xTrain / yTrain are REQUIRED.
   * - xTest / yTest are OPTIONAL (if provided we track best model by test accuracy).
   * - Records telemetry after each weight update.
   */
  train(
    xTrain: number[][],
    yTrain: number[],
    maxEpochs = 10,
    xTest: number[][],
    yTest: number[],
    options: {
      recordWeightSnapshots?: boolean // default false (include weights in telemetry)
      shuffleEachEpoch?: boolean      // default true
    }
  ) {
    if (!xTrain?.length) throw new Error('Empty training set')
    if (xTrain.length !== yTrain.length) throw new Error('xTrain/yTrain length mismatch')
    const nFeatures = xTrain[0].length

    const recordWeightSnapshots = options?.recordWeightSnapshots ?? false
    const shuffleEachEpoch = options?.shuffleEachEpoch ?? true

    // 1) Fit scaler on training; normalize train/test consistently
    this.scaler = findMinMax(xTrain)
    const X = useMinMaxScale(xTrain, this.scaler)
    const Xtest = (xTest && yTest && xTest.length)
      ? useMinMaxScale(xTest, this.scaler)
      : undefined

    // 2) initialize weights (bias + features)
    this.w = Array(nFeatures + 1).fill(0)

    // Reset run state
    this.telemetry = []
    this.bestScore = -Infinity
    this.bestWeights = null
    this.epochs = 0

    let globalStep = 0

    for (let epoch = 1; epoch <= maxEpochs; epoch++) {
      let errorsThisEpoch = 0

      // optionally shuffle indices for robustness
      const idxs = [...X.keys()]
      if (shuffleEachEpoch) {
        for (let i = idxs.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[idxs[i], idxs[j]] = [idxs[j], idxs[i]]
        }
      }

      for (const i of idxs) {
        const row = X[i]
        const yhat = this.predictRowNormalized(row)
        const err = (yTrain[i] - yhat) as -1 | 0 | 1

        if (err !== 0) {
          // update weights: w <- w + alpha * err * xAug
          const xAug = applyBias(row)
          for (let k = 0; k < this.w.length; k++) {
            this.w[k] += this.learningRate * err * xAug[k]
          }
          errorsThisEpoch++
          globalStep++

          // After every update, evaluate on full train (and test if provided)
          const trainEval = this.evaluate(xTrain, yTrain)
          this.lastTrainAccuracy = trainEval.accuracy

          let testAcc: number | undefined = undefined
          if (Xtest && yTest) {
            const testEval = this.evaluate(xTest, yTest)
            this.lastTestAccuracy = testEval.accuracy
            testAcc = testEval.accuracy
          }

          // record telemetry
          this.telemetry.push({
            epoch,
            step: globalStep,
            exampleIndex: i,
            error: err,
            trainAccuracy: this.lastTrainAccuracy,
            testAccuracy: testAcc,
            weightsSnapshot: recordWeightSnapshots ? [...this.w] : undefined,
          })

          // Track best model: prioritize test accuracy if available, else train
          const score = (testAcc ?? this.lastTrainAccuracy)
          if (score > this.bestScore) {
            this.bestScore = score
            this.bestWeights = [...this.w]
          }
        }
      }

      this.epochs = epoch
      if (errorsThisEpoch === 0) break // early stop on perfect separability
    }
  }

  /**
   * Restore the best weights found during the last training run.
   * (Keeps the same scaler.)
   */
  loadBest() {
    if (!this.bestWeights) throw new Error('No best weights saved—train first')
    this.w = [...this.bestWeights]
  }

  /**
   * Evaluate on raw (unscaled) features.
   */
  evaluate(x: number[][], y: number[]): EvalDetails {
    if (!this.scaler || this.w.length === 0) throw new Error('Model not trained')
    const X = useMinMaxScale(x, this.scaler)
    return this.evaluateNormalized(X, y)
  }

  /**
   * Predict a single raw row.
   */
  predict_one(x: number[]): 0 | 1 {
    if (!this.scaler || this.w.length === 0) throw new Error('Model not trained')
    const [normalized_x] = useMinMaxScale([x], this.scaler)
    return stepActivation(dotProduct(this.w, applyBias(normalized_x)))
  }

  /**
   * Predict many rows and optionally return correctness and accuracy
   * (convenient for UI tables).
   */
  predict(
    x: number[][],
    yTrue?: number[]
  ): (0 | 1)[] | { yhat: (0 | 1)[]; correct: boolean[]; accuracy: number } {
    if (!this.scaler || this.w.length === 0) throw new Error('Model not trained')
    const normalized_x = useMinMaxScale(x, this.scaler)
    const yhat = normalized_x.map(
      row => stepActivation(dotProduct(this.w, applyBias(row)))
    )
    if (yTrue && yTrue.length === yhat.length) {
      const correct = yhat.map((p, i) => p === yTrue[i])
      const accuracy = correct.filter(Boolean).length / yhat.length
      return { yhat, correct, accuracy }
    }
    return yhat
  }

  /**
   * Lightweight getters for UI
   */
  getWeights() { return [...this.w] }
  getBestScore() { return this.bestScore }
  getLastTrainAccuracy() { return this.lastTrainAccuracy }
  getLastTestAccuracy() { return this.lastTestAccuracy }
  getTelemetry() { return [...this.telemetry] }
}

export default Perceptron






// type Scaler = { mins: number[]; maxs: number[] }

// // multiply the feature values by the answer values
// function dotProduct(x: number[], y: number[]) {
//   let res = 0
//   for (let i = 0; i < x.length; i++) {
//     res += x[i] * y[i]
//   }
//   return res
// }

// function applyBias(x: number[]) {
//   return [1, ...x]
// }

// // binary output
// function stepActivation(x: number) {
//   return x >= 0 ? 1 : 0
// }

// // find the min and max ranges
// function findMinMax(x: number[][]): Scaler {
//   const len = x[0].length
//   let mins = Array(len).fill(Number.POSITIVE_INFINITY)
//   let maxs = Array(len).fill(Number.NEGATIVE_INFINITY)

//   for (const row of x) {
//     for (let j = 0; j < len; j++) {
//       if (row[j] < mins[j]) {
//         mins[j] = row[j]
//       }

//       if (row[j] > maxs[j]) {
//         maxs[j] = row[j]
//       }
//     }
//   }

//   return { mins, maxs }
// }

// // normalize scales for features so they're all the same
// function useMinMaxScale(x: number[][], s: Scaler): number[][] {
//   return x.map(row =>
//     row.map((value, idx) => {
//       const range = s.maxs[idx] - s.mins[idx]
//       return range === 0 ? 0 : (value - s.mins[idx]) / range
//     })
//   )
// }



// class Perceptron {
//   epochs = 0 // times we train it
//   learningRate = 0.01 // alpha, weight adjustments
//   w = [] // w: weights
//   scaler: Scaler | null = null


//   // x: feature data, y: pass/fail label
//   train(x: number[][], y: number, maxEpochs = 10) {

//   }

//   predict_one(x: number[]): 0 | 1 {
//     if (!this.scaler || this.w.length === 0) throw new Error('Model not trained')
//     const [normalized_x] = useMinMaxScale([x], this.scaler)
//     return stepActivation(dotProduct(this.w, applyBias(normalized_x)))
//   }

//   predict(x: number[][]): (0 | 1)[] {
//     if (!this.scaler || this.w.length === 0) throw new Error('Model not trained')
//     const normalized_x = useMinMaxScale(x, this.scaler)
//     return normalized_x.map(
//       row => stepActivation(dotProduct(this.w, applyBias(row)))
//     )
//   }
// }
