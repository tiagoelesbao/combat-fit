//
//  WatchWorkoutView.swift
//  CombatFitWatch
//  Interface Principal no Pulso para o Lutador
//

import SwiftUI

struct WatchWorkoutView: View {
    @StateObject private var healthManager = WatchHealthKitManager.shared
    
    // Dados da sessão atual (Segunda: Treino A por padrão)
    @State private var currentDay: WorkoutDay
    @State private var currentExerciseIndex: Int = 0
    @State private var currentSetIndex: Int = 0
    
    // Timer de descanso ativo
    @State private var isRestTimerActive: Bool = false
    @State private var restSecondsRemaining: Int = 90
    @State private var restTimer: Timer?
    
    // Metrônomo ativo
    @State private var isShowingMetronome: Bool = false
    
    init() {
        let workouts = PeriodizationEngine.generateWeekWorkouts(athleteWeight: 60.0, week: 1)
        _currentDay = State(initialValue: workouts["seg"]!)
    }
    
    var currentExercise: Exercise? {
        guard currentExerciseIndex < currentDay.exercises.count else { return nil }
        return currentDay.exercises[currentExerciseIndex]
    }
    
    var currentSet: ExerciseSet? {
        guard let ex = currentExercise, currentSetIndex < ex.sets.count else { return nil }
        return ex.sets[currentSetIndex]
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 8) {
                    
                    // Top Bar: Heart Rate & Total Volume
                    HStack {
                        HStack(spacing: 3) {
                            Image(systemName: "heart.fill")
                                .foregroundColor(.red)
                                .font(.system(size: 11))
                            Text("\(Int(healthManager.currentHeartRate))")
                                .font(.system(size: 13, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                            Text("BPM")
                                .font(.system(size: 9, weight: .semibold))
                                .foregroundColor(.gray)
                        }
                        
                        Spacer()
                        
                        Text("\(Int(currentDay.totalWorkoutVolume)) kg")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .foregroundColor(.orange)
                    }
                    .padding(.horizontal, 4)
                    
                    if let ex = currentExercise, let set = currentSet {
                        // Exercise Info Card
                        VStack(alignment: .leading, spacing: 3) {
                            Text(ex.name)
                                .font(.system(size: 15, weight: .heavy, design: .rounded))
                                .foregroundColor(.white)
                                .lineLimit(2)
                            
                            HStack {
                                Text(ex.loadPercentageText)
                                    .font(.system(size: 10, weight: .bold))
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 2)
                                    .background(Color.orange.opacity(0.2))
                                    .foregroundColor(.orange)
                                    .cornerRadius(4)
                                
                                Spacer()
                                
                                Text("SÉRIE \(set.setNumber) / \(ex.sets.count)")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.gray)
                            }
                        }
                        .padding(8)
                        .background(Color.white.opacity(0.08))
                        .cornerRadius(10)
                        
                        // Target Values Display (Weight & Reps)
                        HStack(spacing: 12) {
                            VStack {
                                Text("CARGA")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundColor(.gray)
                                Text("\(set.weight, specifier: "%.1f") kg")
                                    .font(.system(size: 18, weight: .black, design: .rounded))
                                    .foregroundColor(.white)
                            }
                            
                            Divider().frame(height: 30)
                            
                            VStack {
                                Text(ex.isSpeedCadence ? "TEMPO" : "REPETIÇÕES")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundColor(.gray)
                                Text(ex.isSpeedCadence ? "8s" : "\(set.reps)")
                                    .font(.system(size: 18, weight: .black, design: .rounded))
                                    .foregroundColor(.white)
                            }
                        }
                        .padding(.vertical, 4)
                        
                        // Action: Complete Set Button (Large for Gloves/Tired Hands)
                        Button(action: completeCurrentSet) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 16, weight: .bold))
                                Text("CONCLUIR SÉRIE")
                                    .font(.system(size: 13, weight: .heavy))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.green)
                            .foregroundColor(.black)
                            .cornerRadius(12)
                        }
                        .buttonStyle(.plain)
                        
                        // Metronome Link if exercise is speed/cadence
                        if ex.isSpeedCadence {
                            NavigationLink(destination: WatchCadenceMetronomeView()) {
                                HStack {
                                    Image(systemName: "metronome.fill")
                                    Text("Metrônomo 8s (2 reps/s)")
                                }
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.orange)
                            }
                        }
                        
                    } else {
                        // All Exercises Completed
                        VStack(spacing: 10) {
                            Image(systemName: "trophy.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.yellow)
                            Text("TREINO CONCLUÍDO!")
                                .font(.system(size: 14, weight: .black))
                            Text("Volume Total: \(Int(currentDay.totalWorkoutVolume)) kg")
                                .font(.system(size: 12))
                                .foregroundColor(.gray)
                        }
                        .padding(.vertical, 16)
                    }
                }
                .padding(.horizontal, 4)
            }
            .navigationTitle("CombatFit")
            .sheet(isPresented: $isRestTimerActive) {
                WatchRestTimerView(
                    secondsRemaining: $restSecondsRemaining,
                    isPresented: $isRestTimerActive
                )
            }
            .onAppear {
                healthManager.requestAuthorization()
                healthManager.startWorkout(type: currentDay.type)
            }
        }
    }
    
    private func completeCurrentSet() {
        guard currentExerciseIndex < currentDay.exercises.count else { return }
        
        // Haptic feedback
        WatchHapticManager.shared.playSetCompleted()
        
        // Mark set as done
        currentDay.exercises[currentExerciseIndex].sets[currentSetIndex].isCompleted = true
        
        // Prepare rest timer
        let restSec = currentDay.exercises[currentExerciseIndex].restDurationSeconds
        restSecondsRemaining = restSec
        isRestTimerActive = true
        
        // Advance to next set or next exercise
        if currentSetIndex + 1 < currentDay.exercises[currentExerciseIndex].sets.count {
            currentSetIndex += 1
        } else if currentExerciseIndex + 1 < currentDay.exercises.count {
            currentExerciseIndex += 1
            currentSetIndex = 0
        } else {
            // Finished full workout
            healthManager.stopWorkout { calories, hr, duration in
                print("Treino salvo com sucesso! Calorias: \(calories), BPM: \(hr)")
            }
        }
    }
}
