//
//  WatchHealthKitManager.swift
//  CombatFitWatch
//  Monitoramento de Frequência Cardíaca (BPM) e Calorias em Tempo Real com HealthKit
//

import Foundation
import HealthKit
import Combine

public final class WatchHealthKitManager: NSObject, ObservableObject {
    public static let shared = WatchHealthKitManager()
    
    private let healthStore = HKHealthStore()
    private var workoutSession: HKWorkoutSession?
    private var workoutBuilder: HKLiveWorkoutBuilder?
    
    @Published public var currentHeartRate: Double = 0.0
    @Published public var activeCalories: Double = 0.0
    @Published public var elapsedSeconds: TimeInterval = 0.0
    @Published public var isWorkoutActive: Bool = false
    
    private var timer: Timer?
    
    public override init() {
        super.init()
    }
    
    public func requestAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else { return }
        
        let typesToShare: Set = [
            HKQuantityType.workoutType()
        ]
        
        let typesToRead: Set = [
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!
        ]
        
        healthStore.requestAuthorization(toShare: typesToShare, read: typesToRead) { success, error in
            if let error = error {
                print("HealthKit Authorization Error: \(error.localizedDescription)")
            }
        }
    }
    
    public func startWorkout(type: WorkoutType) {
        let config = HKWorkoutConfiguration()
        config.activityType = (type == .sprints || type == .intervals) ? .highIntensityIntervalTraining : .traditionalStrengthTraining
        config.locationType = .indoor
        
        do {
            workoutSession = try HKWorkoutSession(healthStore: healthStore, configuration: config)
            workoutBuilder = workoutSession?.associatedWorkoutBuilder()
            
            workoutSession?.delegate = self
            workoutBuilder?.delegate = self
            
            workoutBuilder?.dataSource = HKLiveWorkoutDataSource(healthStore: healthStore, workoutConfiguration: config)
            
            let startDate = Date()
            workoutSession?.startActivity(with: startDate)
            workoutBuilder?.beginCollection(withStart: startDate) { [weak self] success, error in
                DispatchQueue.main.async {
                    self?.isWorkoutActive = true
                    self?.startTimer()
                }
            }
        } catch {
            print("Failed to start watch workout session: \(error.localizedDescription)")
        }
    }
    
    public func stopWorkout(completion: @escaping (Double, Double, TimeInterval) -> Void) {
        guard let session = workoutSession, let builder = workoutBuilder else { return }
        
        stopTimer()
        session.end()
        
        let finalCalories = self.activeCalories
        let finalHR = self.currentHeartRate
        let finalDuration = self.elapsedSeconds
        
        builder.endCollection(withEnd: Date()) { [weak self] success, error in
            builder.finishWorkout { workout, error in
                DispatchQueue.main.async {
                    self?.isWorkoutActive = false
                    self?.currentHeartRate = 0
                    self?.activeCalories = 0
                    self?.elapsedSeconds = 0
                    completion(finalCalories, finalHR, finalDuration)
                }
            }
        }
    }
    
    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            self?.elapsedSeconds += 1.0
        }
    }
    
    private func stopTimer() {
        timer?.invalidate()
        timer = nil
    }
}

// MARK: - HKWorkoutSessionDelegate & HKLiveWorkoutBuilderDelegate
extension WatchHealthKitManager: HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
    public func workoutSession(_ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState, from fromState: HKWorkoutSessionState, date: Date) {
        // State updates
    }
    
    public func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        print("Workout session failed: \(error.localizedDescription)")
    }
    
    public func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}
    
    public func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>) {
        for type in collectedTypes {
            guard let quantityType = type as? HKQuantityType else { continue }
            
            if quantityType == HKQuantityType.quantityType(forIdentifier: .heartRate) {
                let stats = workoutBuilder.statistics(for: quantityType)
                if let quantity = stats?.mostRecentQuantity() {
                    let bpm = quantity.doubleValue(for: HKUnit(from: "count/min"))
                    DispatchQueue.main.async {
                        self.currentHeartRate = bpm
                    }
                }
            } else if quantityType == HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
                let stats = workoutBuilder.statistics(for: quantityType)
                if let quantity = stats?.sumQuantity() {
                    let kcal = quantity.doubleValue(for: .kilocalorie())
                    DispatchQueue.main.async {
                        self.activeCalories = kcal
                    }
                }
            }
        }
    }
}
