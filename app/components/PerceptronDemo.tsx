'use client'
// @ts-nocheck
import React, { useEffect, useState } from 'react'
import Papa from 'papaparse'
import Perceptron from '../classes/Perceptron'

type Student = {
  hours_studied: number
  attendance_rate: number
  pass: number
}

type StudentData = Student[]

const PerceptronDemo = () => {
  const [trainingData, setTrainingData] = useState<StudentData>([])
  const [testData, setTestData] = useState<StudentData>([])
  const [error, setError] = useState<string | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [trainedModel, setTrainedModel] = useState<Perceptron | null>(null)
  
  // Training parameters
  const [maxEpochs, setMaxEpochs] = useState(50)
  const [learningRate, setLearningRate] = useState(0.1)
  const [shuffleEachEpoch, setShuffleEachEpoch] = useState(true)
  
  // Single prediction input
  const [predictionHours, setPredictionHours] = useState(5)
  const [predictionAttendance, setPredictionAttendance] = useState(70)

  // Load CSV data
  useEffect(() => {
    const load = async () => {
      try {
        const [trainRes, testRes] = await Promise.all([
          fetch('/data/training_data.csv', { cache: 'no-store' }),
          fetch('/data/test_data.csv', { cache: 'no-store' })
        ])
        const [trainText, testText] = await Promise.all([
          trainRes.text(),
          testRes.text()
        ])

        const trainParsed = Papa.parse<Student>(trainText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        })
        const testParsed = Papa.parse<Student>(testText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        })

        const clean = (rows: any[]): StudentData =>
          rows.filter(
            (r) =>
              Number.isFinite(r.hours_studied) &&
              Number.isFinite(r.attendance_rate) &&
              (r.pass === 0 || r.pass === 1)
          )

        setTrainingData(clean(trainParsed.data as any[]))
        setTestData(clean(testParsed.data as any[]))
      } catch (e: any) {
        console.error(e)
        setError(e?.message ?? 'Failed to load CSVs')
      }
    }
    load()
  }, [])

  const handleTrain = async () => {
    if (!trainingData.length || !testData.length) {
      setError('Need both training and test data')
      return
    }

    setIsTraining(true)
    setError(null)

    try {
      const model = new Perceptron()
      model.learningRate = learningRate

      const xTrain = trainingData.map(d => [d.hours_studied, d.attendance_rate])
      const yTrain = trainingData.map(d => d.pass)
      const xTest = testData.map(d => [d.hours_studied, d.attendance_rate])
      const yTest = testData.map(d => d.pass)

      await new Promise(resolve => setTimeout(resolve, 100))
      
      model.train(xTrain, yTrain, maxEpochs, xTest, yTest, {
        shuffleEachEpoch,
        recordWeightSnapshots: false
      })

      setTrainedModel(model)
    } catch (e: any) {
      setError(e?.message ?? 'Training failed')
    } finally {
      setIsTraining(false)
    }
  }

  const makePrediction = () => {
    if (!trainedModel || !trainedModel.w || trainedModel.w.length === 0) return null
    if (predictionHours < 0 || predictionAttendance < 0) return null
    try {
      return trainedModel.predict_one([predictionHours || 0, predictionAttendance || 0])
    } catch {
      return null
    }
  }

  const getDecisionBoundaryPoints = () => {
    if (!trainedModel || trainedModel.w.length === 0) return []
    
    const weights = trainedModel.getWeights()
    const [bias, w1, w2] = weights
    
    // Decision boundary: bias + w1*x1 + w2*x2 = 0
    // Solve for x2: x2 = -(bias + w1*x1) / w2
    const points = []
    for (let hours = 0; hours <= 10; hours += 0.5) {
      if (w2 !== 0) {
        const attendance = -(bias + w1 * (hours / 10)) / w2 * 100 // Scale back to percentage
        if (attendance >= 0 && attendance <= 100) {
          points.push({ hours, attendance })
        }
      }
    }
    return points
  }

  const prediction = makePrediction()
  const boundaryPoints = getDecisionBoundaryPoints()

  return (
    <div className="h-screen bg-gray-50 p-3 overflow-hidden">
      <div className="h-full grid grid-cols-12 gap-3">
        
        {/* Left Panel - Controls & Stats */}
        <div className="col-span-3 space-y-3">
          
          {/* Training Controls */}
          <div className="bg-white border border-gray-300 p-3">
            <h2 className="text-sm font-bold mb-3">Training Controls</h2>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium mb-1">Max Epochs</label>
                <input
                  type="number"
                  value={maxEpochs}
                  onChange={(e) => setMaxEpochs(parseInt(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 text-xs"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Learning Rate</label>
                <input
                  type="number"
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 text-xs"
                  step="0.01"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="shuffle"
                  checked={shuffleEachEpoch}
                  onChange={(e) => setShuffleEachEpoch(e.target.checked)}
                  className="w-3 h-3"
                />
                <label htmlFor="shuffle" className="text-xs">Shuffle each epoch</label>
              </div>
              <button
                onClick={handleTrain}
                disabled={isTraining || !trainingData.length}
                className="w-full bg-blue-600 text-white py-2 px-3 text-xs font-medium hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isTraining ? 'Training...' : 'Train Model'}
              </button>
            </div>
          </div>

          {/* Model Stats */}
          <div className="bg-white border border-gray-300 p-3">
            <h2 className="text-sm font-bold mb-3">Model Performance</h2>
            {trainedModel ? (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-blue-50 border">
                    <div className="font-bold text-lg">{(trainedModel.getLastTrainAccuracy() * 100).toFixed(1)}%</div>
                    <div className="text-gray-600">Train Acc</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 border">
                    <div className="font-bold text-lg">{(trainedModel.getLastTestAccuracy() * 100).toFixed(1)}%</div>
                    <div className="text-gray-600">Test Acc</div>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Epochs:</span>
                    <span className="font-medium">{trainedModel.epochs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Updates:</span>
                    <span className="font-medium">{trainedModel.getTelemetry().length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Best Score:</span>
                    <span className="font-medium">{(trainedModel.getBestScore() * 100).toFixed(1)}%</span>
                  </div>
                </div>
                {trainedModel.w.length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="font-medium mb-1">Weights:</div>
                    <div className="text-xs font-mono">
                      <div>Bias: {trainedModel.w[0].toFixed(3)}</div>
                      <div>Hours: {trainedModel.w[1].toFixed(3)}</div>
                      <div>Attend: {trainedModel.w[2].toFixed(3)}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Train a model to see stats</p>
            )}
          </div>

          {/* Single Prediction */}
          <div className="bg-white border border-gray-300 p-3">
            <h2 className="text-sm font-bold mb-3">Test Single Input</h2>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-medium mb-1">Hours Studied</label>
                <input
                  type="number"
                  value={predictionHours}
                  onChange={(e) => setPredictionHours(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 text-xs"
                  step="0.1"
                  min="0"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Attendance Rate (%)</label>
                <input
                  type="number"
                  value={predictionAttendance}
                  onChange={(e) => setPredictionAttendance(parseFloat(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 text-xs"
                  min="0"
                  max="100"
                />
              </div>
              {prediction !== null ? (
                <div className={`p-3 text-center font-bold ${prediction === 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <div className="text-lg">{prediction === 1 ? 'PASS' : 'FAIL'}</div>
                  <div className="text-xs">Prediction: {prediction}</div>
                </div>
              ) : (
                <div className="p-3 text-center text-gray-500 border border-gray-200">
                  <div className="text-sm">Click Predict to see result</div>
                </div>
              )}
            </div>
          </div>

          {/* Data Info */}
          <div className="bg-white border border-gray-300 p-3">
            <h2 className="text-sm font-bold mb-3">Dataset Info</h2>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Training samples:</span>
                <span className="font-medium">{trainingData.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Test samples:</span>
                <span className="font-medium">{testData.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Panel - Decision Boundary Visualization */}
        <div className="col-span-5 bg-white border border-gray-300 p-3">
          <h2 className="text-sm font-bold mb-3">Decision Boundary & Data Points</h2>
          <div className="relative w-full h-full">
            <svg viewBox="0 0 400 300" className="w-full h-full border border-gray-200">
              {/* Grid lines */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                <g key={`grid-${i}`}>
                  <line x1={i * 40} y1="0" x2={i * 40} y2="300" stroke="#f0f0f0" strokeWidth="1"/>
                  <line x1="0" y1={i * 30} x2="400" y2={i * 30} stroke="#f0f0f0" strokeWidth="1"/>
                </g>
              ))}
              
              {/* Axes */}
              <line x1="0" y1="300" x2="400" y2="300" stroke="#666" strokeWidth="2"/>
              <line x1="0" y1="0" x2="0" y2="300" stroke="#666" strokeWidth="2"/>
              
              {/* Axis labels */}
              <text x="200" y="295" textAnchor="middle" fontSize="10" fill="#666">Hours Studied</text>
              <text x="5" y="150" textAnchor="middle" fontSize="10" fill="#666" transform="rotate(-90, 5, 150)">Attendance %</text>
              
              {/* Training data points */}
              {trainingData.map((point, i) => (
                <circle
                  key={`train-${i}`}
                  cx={point.hours_studied * 40}
                  cy={300 - (point.attendance_rate * 3)}
                  r="4"
                  fill={point.pass === 1 ? "#22c55e" : "#ef4444"}
                  stroke="#000"
                  strokeWidth="1"
                  opacity="0.8"
                />
              ))}
              
              {/* Test data points (different shape) */}
              {testData.map((point, i) => (
                <rect
                  key={`test-${i}`}
                  x={point.hours_studied * 40 - 3}
                  y={300 - (point.attendance_rate * 3) - 3}
                  width="6"
                  height="6"
                  fill={point.pass === 1 ? "#22c55e" : "#ef4444"}
                  stroke="#000"
                  strokeWidth="1"
                  opacity="0.8"
                />
              ))}
              
              {/* Decision boundary line */}
              {boundaryPoints.length > 1 && (
                <polyline
                  points={boundaryPoints.map(p => `${p.hours * 40},${300 - (p.attendance * 3)}`).join(' ')}
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="3"
                  opacity="0.8"
                />
              )}
              
              {/* Current prediction point */}
              {prediction !== null && (
                <circle
                  cx={predictionHours * 40}
                  cy={300 - (predictionAttendance * 3)}
                  r="6"
                  fill={prediction === 1 ? "#22c55e" : "#ef4444"}
                  stroke="#000"
                  strokeWidth="3"
                  opacity="1"
                />
              )}
              
              {/* Scale markers */}
              {[0, 2, 4, 6, 8, 10].map(i => (
                <text key={`x-${i}`} x={i * 40} y="295" textAnchor="middle" fontSize="8" fill="#666">{i}</text>
              ))}
              {[0, 20, 40, 60, 80, 100].map(i => (
                <text key={`y-${i}`} x="-5" y={300 - (i * 3) + 3} textAnchor="end" fontSize="8" fill="#666">{i}</text>
              ))}
            </svg>
            
            {/* Legend */}
            <div className="absolute top-2 right-2 bg-white border border-gray-300 p-2 text-xs">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <circle className="w-3 h-3 bg-green-500 border border-black rounded-full"></circle>
                  <span>Pass</span>
                </div>
                <div className="flex items-center space-x-2">
                  <circle className="w-3 h-3 bg-red-500 border border-black rounded-full"></circle>
                  <span>Fail</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 border border-black"></div>
                  <span>Test Data</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 bg-purple-500"></div>
                  <span>Boundary</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Performance Charts & Telemetry */}
        <div className="col-span-4 space-y-3">
          
          {/* Performance Over Time Chart */}
          <div className="bg-white border border-gray-300 p-3 h-64">
            <h2 className="text-sm font-bold mb-3">Training Progress</h2>
            {trainedModel && trainedModel.getTelemetry().length > 0 ? (
              <div className="relative w-full h-full">
                <svg viewBox="0 0 300 180" className="w-full h-full">
                  {/* Grid */}
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <line key={`grid-y-${i}`} x1="0" y1={i * 36} x2="300" y2={i * 36} stroke="#f0f0f0" strokeWidth="1"/>
                  ))}
                  
                  {/* Axes */}
                  <line x1="0" y1="180" x2="300" y2="180" stroke="#666" strokeWidth="1"/>
                  <line x1="0" y1="0" x2="0" y2="180" stroke="#666" strokeWidth="1"/>
                  
                  {/* Training accuracy line */}
                  {trainedModel.getTelemetry().length > 1 && (
                    <polyline
                      points={trainedModel.getTelemetry().map((step, i) => 
                        `${(i / (trainedModel.getTelemetry().length - 1)) * 300},${180 - (step.trainAccuracy * 180)}`
                      ).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                  )}
                  
                  {/* Test accuracy line */}
                  {trainedModel.getTelemetry().length > 1 && (
                    <polyline
                      points={trainedModel.getTelemetry().map((step, i) => 
                        `${(i / (trainedModel.getTelemetry().length - 1)) * 300},${180 - ((step.testAccuracy || 0) * 180)}`
                      ).join(' ')}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                    />
                  )}
                  
                  {/* Y-axis labels */}
                  {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((val, i) => (
                    <text key={`y-${i}`} x="-5" y={180 - (val * 180) + 3} textAnchor="end" fontSize="8" fill="#666">
                      {(val * 100).toFixed(0)}%
                    </text>
                  ))}
                </svg>
                
                {/* Chart Legend */}
                <div className="absolute top-2 right-2 bg-white border border-gray-300 p-1 text-xs">
                  <div className="flex items-center space-x-1 mb-1">
                    <div className="w-3 h-0.5 bg-blue-500"></div>
                    <span>Train</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-0.5 bg-red-500"></div>
                    <span>Test</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500">Train model to see progress</p>
            )}
          </div>

          {/* Training Telemetry */}
          <div className="bg-white border border-gray-300 p-3 flex-1">
            <h2 className="text-sm font-bold mb-3">Training Steps</h2>
            {trainedModel && trainedModel.getTelemetry().length > 0 ? (
              <div className="h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50 sticky top-0">
                      <th className="text-left p-1">Step</th>
                      <th className="text-left p-1">Epoch</th>
                      <th className="text-left p-1">Error</th>
                      <th className="text-left p-1">Train</th>
                      <th className="text-left p-1">Test</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainedModel.getTelemetry().slice(-20).map((step, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-1">{step.step}</td>
                        <td className="p-1">{step.epoch}</td>
                        <td className="p-1 font-mono">{step.error > 0 ? '+1' : '-1'}</td>
                        <td className="p-1">{(step.trainAccuracy * 100).toFixed(0)}%</td>
                        <td className="p-1">{step.testAccuracy ? (step.testAccuracy * 100).toFixed(0) + '%' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-gray-500">No training data yet</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-300 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  )
}

export default PerceptronDemo


// // @ts-nocheck
// 'use client'

// import React, { useEffect, useState } from 'react'
// import Papa from 'papaparse'

// type Student = {
//   hours_studied: number
//   attendance_rate: number
//   pass: number
// }
// type StudentData = Student[]

// const PerceptronDemo = () => {
//   const [trainingData, setTrainingData] = useState<StudentData>([])
//   const [testData, setTestData] = useState<StudentData>([])
//   const [error, setError] = useState<string | null>(null)

//   useEffect(() => {
//     const load = async () => {
//       try {
//         // Fetch CSVs from /public
//         const [trainRes, testRes] = await Promise.all([
//           fetch('/data/training_data.csv', { cache: 'no-store' }),
//           fetch('/data/test_data.csv', { cache: 'no-store' })
//         ])
//         const [trainText, testText] = await Promise.all([
//           trainRes.text(),
//           testRes.text()
//         ])

//         // Parse CSV text
//         const trainParsed = Papa.parse<Student>(trainText, {
//           header: true,
//           dynamicTyping: true,
//           skipEmptyLines: true,
//         })
//         const testParsed = Papa.parse<Student>(testText, {
//           header: true,
//           dynamicTyping: true,
//           skipEmptyLines: true,
//         })

//         // Clean rows that might be empty or malformed
//         const clean = (rows: any[]): StudentData =>
//           rows.filter(
//             (r) =>
//               Number.isFinite(r.hours_studied) &&
//               Number.isFinite(r.attendance_rate) &&
//               (r.pass === 0 || r.pass === 1)
//           )

//         setTrainingData(clean(trainParsed.data as any[]))
//         setTestData(clean(testParsed.data as any[]))
//       } catch (e: any) {
//         console.error(e)
//         setError(e?.message ?? 'Failed to load CSVs')
//       }
//     }

//     load()
//   }, [])

//   return (
//     <main className="flex flex-1 p-2 justify-center items-center flex-row h-auto bg-amber-200 text-black">
//       <section className="flex flex-1 flex-col items-center justify-center h-full gap-2">
//         <h2 className="font-semibold">Data Section</h2>
//         {error && <p className="text-red-700">Error: {error}</p>}

//         <div className="w-full max-w-xl">
//           <h3 className="font-medium mb-1">Training Data ({trainingData.length})</h3>
//           <pre className="text-xs bg-white/70 p-2 rounded">
//             {JSON.stringify(trainingData, null, 2)}
//           </pre>
//         </div>

//         <div className="w-full max-w-xl">
//           <h3 className="font-medium mb-1">Test Data ({testData.length})</h3>
//           <pre className="text-xs bg-white/70 p-2 rounded">
//             {JSON.stringify(testData, null, 2)}
//           </pre>
//         </div>
//       </section>

//       <aside className="flex flex-1 flex-col items-center justify-center h-full">
//         <div>Graph Aside</div>
//         <div>Telemetry</div>
//       </aside>
//     </main>
//   )
// }

// export default PerceptronDemo
