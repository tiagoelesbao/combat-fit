//
//  DashboardView.swift
//  CombatFitIOS
//  Painel Principal de Treino para iPhone com Suporte ao Apple Watch
//

import SwiftUI
import Charts

struct DashboardView: View {
    @StateObject private var watchSync = WatchSyncService.shared
    
    @State private var athleteWeight: Double = 60.0
    @State private var currentWeek: Int = 1
    @State private var activeDayKey: String = "seg"
    @State private var weekWorkouts: [String: WorkoutDay] = [:]
    
    @State private var isShowingSettings: Bool = false
    
    var currentDay: WorkoutDay? {
        return weekWorkouts[activeDayKey]
    }
    
    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.04, green: 0.05, blue: 0.07).ignoresSafeArea()
                
                VStack(spacing: 0) {
                    
                    // Top Bar: Athlete & Watch Badge
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("LUTADOR • FASE 1")
                                .font(.system(size: 11, weight: .heavy))
                                .foregroundColor(.gray)
                            HStack(spacing: 6) {
                                Text("\(athleteWeight, specifier: "%.1f") kg")
                                    .font(.system(size: 13, weight: .bold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Color.white.opacity(0.1))
                                    .cornerRadius(6)
                                
                                Text("Semana \(currentWeek) (\(PeriodizationEngine.getWeekStrengthPercentage(week: currentWeek))% BW)")
                                    .font(.system(size: 13, weight: .bold))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Color.orange.opacity(0.2))
                                    .foregroundColor(.orange)
                                    .cornerRadius(6)
                            }
                        }
                        
                        Spacer()
                        
                        // Watch status indicator
                        HStack(spacing: 4) {
                            Image(systemName: "applewatch")
                                .foregroundColor(watchSync.isReachable ? .green : .gray)
                            Text(watchSync.isReachable ? "Conectado" : "Watch")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(watchSync.isReachable ? .green : .gray)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.black.opacity(0.4))
                        .cornerRadius(8)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    
                    // Day Selector Strip
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            DayPillButton(abbr: "SEG", tag: "Treino A", isSelected: activeDayKey == "seg") {
                                activeDayKey = "seg"
                            }
                            DayPillButton(abbr: "TER", tag: "30m Sprints", isSelected: activeDayKey == "ter") {
                                activeDayKey = "ter"
                            }
                            DayPillButton(abbr: "QUA", tag: "Treino B", isSelected: activeDayKey == "qua") {
                                activeDayKey = "qua"
                            }
                            DayPillButton(abbr: "QUI", tag: "200m Corrida", isSelected: activeDayKey == "qui") {
                                activeDayKey = "qui"
                            }
                            DayPillButton(abbr: "SEX", tag: "Treino C", isSelected: activeDayKey == "sex") {
                                activeDayKey = "sex"
                            }
                            DayPillButton(abbr: "SÁB", tag: "Ativo", isSelected: activeDayKey == "sab") {
                                activeDayKey = "sab"
                            }
                            DayPillButton(abbr: "DOM", tag: "Off", isSelected: activeDayKey == "dom") {
                                activeDayKey = "dom"
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.vertical, 8)
                    
                    // Main Workout Content
                    if let day = currentDay {
                        ScrollView {
                            VStack(spacing: 14) {
                                
                                // Overview Card
                                VStack(alignment: .leading, spacing: 8) {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(day.badge)
                                                .font(.system(size: 10, weight: .heavy))
                                                .foregroundColor(.orange)
                                            Text(day.dayTitle)
                                                .font(.system(size: 20, weight: .black, design: .rounded))
                                                .foregroundColor(.white)
                                        }
                                        Spacer()
                                        VStack(alignment: .trailing, spacing: 2) {
                                            Text("\(Int(day.totalWorkoutVolume))")
                                                .font(.system(size: 22, weight: .black, design: .rounded))
                                                .foregroundColor(.orange)
                                            Text("kg total")
                                                .font(.system(size: 9, weight: .bold))
                                                .foregroundColor(.gray)
                                        }
                                    }
                                    
                                    Text(day.description)
                                        .font(.system(size: 12))
                                        .foregroundColor(.gray)
                                    
                                    HStack {
                                        Text("Séries: \(day.completedSetsCount) / \(day.totalSetsCount)")
                                            .font(.system(size: 11, weight: .bold))
                                            .foregroundColor(.white)
                                        Spacer()
                                        Text("Intensidade: \(day.intensityText)")
                                            .font(.system(size: 11, weight: .semibold))
                                            .foregroundColor(.gray)
                                    }
                                    .padding(.top, 4)
                                }
                                .padding(16)
                                .background(Color(red: 0.08, green: 0.10, blue: 0.15))
                                .cornerRadius(16)
                                
                                // Exercises List
                                if day.type == .gym {
                                    ForEach(day.exercises.indices, id: \.self) { exIndex in
                                        ExerciseCard(
                                            exercise: day.exercises[exIndex],
                                            onToggleSet: { setIdx in
                                                if var d = weekWorkouts[activeDayKey] {
                                                    d.exercises[exIndex].sets[setIdx].isCompleted.toggle()
                                                    weekWorkouts[activeDayKey] = d
                                                }
                                            }
                                        )
                                    }
                                } else if day.type == .sprints || day.type == .intervals {
                                    // Running List
                                    VStack(spacing: 8) {
                                        ForEach(day.runningShots.indices, id: \.self) { shotIndex in
                                            let shot = day.runningShots[shotIndex]
                                            HStack {
                                                Text("Tiro #\(shot.roundNumber) (\(shot.distanceMeters)m)")
                                                    .font(.system(size: 14, weight: .bold))
                                                    .foregroundColor(.white)
                                                Spacer()
                                                Button(action: {
                                                    if var d = weekWorkouts[activeDayKey] {
                                                        d.runningShots[shotIndex].isCompleted.toggle()
                                                        weekWorkouts[activeDayKey] = d
                                                    }
                                                }) {
                                                    Image(systemName: shot.isCompleted ? "checkmark.circle.fill" : "circle")
                                                        .font(.system(size: 24))
                                                        .foregroundColor(shot.isCompleted ? .green : .gray)
                                                }
                                            }
                                            .padding(12)
                                            .background(Color(red: 0.08, green: 0.10, blue: 0.15))
                                            .cornerRadius(12)
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 30)
                        }
                    }
                }
            }
            .navigationTitle("CombatFit")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { isShowingSettings = true }) {
                        Image(systemName: "slider.horizontal.3")
                            .foregroundColor(.orange)
                    }
                }
            }
            .onAppear {
                reloadWorkouts()
            }
        }
    }
    
    private func reloadWorkouts() {
        weekWorkouts = PeriodizationEngine.generateWeekWorkouts(athleteWeight: athleteWeight, week: currentWeek)
    }
}

// MARK: - Subcomponents
struct DayPillButton: View {
    let abbr: String
    let tag: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text(abbr)
                    .font(.system(size: 13, weight: .black, design: .rounded))
                Text(tag)
                    .font(.system(size: 9, weight: .bold))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.orange : Color(red: 0.08, green: 0.10, blue: 0.15))
            .foregroundColor(isSelected ? .black : .white)
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

struct ExerciseCard: View {
    let exercise: Exercise
    let onToggleSet: (Int) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(exercise.name)
                        .font(.system(size: 16, weight: .heavy, design: .rounded))
                        .foregroundColor(.white)
                    Text(exercise.transferDescription)
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(exercise.loadPercentageText)
                        .font(.system(size: 10, weight: .bold))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.orange.opacity(0.15))
                        .foregroundColor(.orange)
                        .cornerRadius(4)
                    Text("\(exercise.targetWeight, specifier: "%.1f") kg")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
            }
            
            // Sets Rows
            VStack(spacing: 6) {
                ForEach(exercise.sets.indices, id: \.self) { setIdx in
                    let set = exercise.sets[setIdx]
                    HStack {
                        Text("#\(set.setNumber)")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.gray)
                            .frame(width: 28, alignment: .leading)
                        
                        Text("\(set.weight, specifier: "%.1f") kg")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                        
                        Text("×")
                            .foregroundColor(.gray)
                        
                        Text("\(set.reps) reps")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.white)
                        
                        Spacer()
                        
                        Text("\(Int(set.weight * Double(set.reps))) kg")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.gray)
                        
                        Button(action: {
                            onToggleSet(setIdx)
                        }) {
                            Image(systemName: set.isCompleted ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 22))
                                .foregroundColor(set.isCompleted ? .green : .gray)
                        }
                    }
                    .padding(8)
                    .background(Color.black.opacity(0.25))
                    .cornerRadius(8)
                }
            }
        }
        .padding(14)
        .background(Color(red: 0.08, green: 0.10, blue: 0.15))
        .cornerRadius(16)
    }
}
