//
//  WorkoutModels.swift
//  CombatFit - Shared Models
//  Metodologia: Periodização Conjugada Aplicada a Esportes de Combate (Hariel Corrêa)
//

import Foundation

public enum WorkoutType: String, Codable {
    case gym
    case sprints
    case intervals
    case recovery
}

public struct ExerciseSet: Identifiable, Codable, Equatable {
    public var id: UUID = UUID()
    public var setNumber: Int
    public var weight: Double
    public var reps: Int
    public var isCompleted: Bool = false
    public var completedAt: Date?
    
    public init(setNumber: Int, weight: Double, reps: Int) {
        self.setNumber = setNumber
        self.weight = weight
        self.reps = reps
    }
    
    public var volume: Double {
        return isCompleted ? (weight * Double(reps)) : 0.0
    }
}

public struct Exercise: Identifiable, Codable, Equatable {
    public var id: String
    public var name: String
    public var transferDescription: String
    public var loadPercentageText: String
    public var targetWeight: Double
    public var targetReps: Int
    public var restDurationSeconds: Int
    public var isSpeedCadence: Bool
    public var sets: [ExerciseSet]
    
    public init(id: String, name: String, transferDescription: String, loadPercentageText: String, targetWeight: Double, targetReps: Int, restDurationSeconds: Int, isSpeedCadence: Bool = false, setsCount: Int = 3) {
        self.id = id
        self.name = name
        self.transferDescription = transferDescription
        self.loadPercentageText = loadPercentageText
        self.targetWeight = targetWeight
        self.targetReps = targetReps
        self.restDurationSeconds = restDurationSeconds
        self.isSpeedCadence = isSpeedCadence
        self.sets = (1...setsCount).map { ExerciseSet(setNumber: $0, weight: targetWeight, reps: targetReps) }
    }
    
    public var isFullyCompleted: Bool {
        return !sets.isEmpty && sets.allSatisfy { $0.isCompleted }
    }
    
    public var totalExerciseVolume: Double {
        return sets.reduce(0.0) { $0 + $1.volume }
    }
}

public struct RunningShot: Identifiable, Codable, Equatable {
    public var id: UUID = UUID()
    public var roundNumber: Int
    public var distanceMeters: Int
    public var durationSeconds: Double?
    public var isCompleted: Bool = false
}

public struct WorkoutDay: Identifiable, Codable {
    public var id: String // "seg", "ter", "qua", "qui", "sex", "sab", "dom"
    public var dayTitle: String
    public var badge: String
    public var description: String
    public var type: WorkoutType
    public var intensityText: String
    public var exercises: [Exercise]
    public var runningShots: [RunningShot]
    
    public var totalWorkoutVolume: Double {
        return exercises.reduce(0.0) { $0 + $1.totalExerciseVolume }
    }
    
    public var completedSetsCount: Int {
        if type == .gym {
            return exercises.flatMap { $0.sets }.filter { $0.isCompleted }.count
        } else {
            return runningShots.filter { $0.isCompleted }.count
        }
    }
    
    public var totalSetsCount: Int {
        if type == .gym {
            return exercises.flatMap { $0.sets }.count
        } else {
            return runningShots.count
        }
    }
}

public struct CompletedWorkoutSession: Identifiable, Codable {
    public var id: UUID = UUID()
    public var date: Date
    public var dayKey: String
    public var title: String
    public var totalVolume: Double
    public var totalSets: Int
    public var durationSeconds: TimeInterval
    public var activeCalories: Double
    public var averageHeartRate: Double
    public var weekNumber: Int
}
