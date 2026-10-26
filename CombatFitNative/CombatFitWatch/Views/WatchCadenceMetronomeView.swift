//
//  WatchCadenceMetronomeView.swift
//  CombatFitWatch
//  Metrônomo com Pulso Físico no Pulso (Taptic Engine)
//

import SwiftUI

struct WatchCadenceMetronomeView: View {
    @State private var repsPerSecond: Double = 2.0 // 2 reps/s ou 1 rep/s
    @State private var timeLeft: Double = 8.0
    @State private var isActive: Bool = false
    @State private var timer: Timer?
    @State private var hapticTimer: Timer?
    @State private var isPulsing: Bool = false
    
    var body: some View {
        VStack(spacing: 8) {
            Text("CADÊNCIA ALÁTICA")
                .font(.system(size: 9, weight: .black))
                .foregroundColor(.orange)
            
            // Selector 1 rep/s ou 2 reps/s
            Picker("Modo", selection: $repsPerSecond) {
                Text("2 r/s").tag(2.0)
                Text("1 r/s").tag(1.0)
            }
            .pickerStyle(.segmented)
            .disabled(isActive)
            
            // Display
            ZStack {
                Circle()
                    .fill(isPulsing ? Color.orange.opacity(0.4) : Color.white.opacity(0.1))
                    .frame(width: 60, height: 60)
                    .scaleEffect(isPulsing ? 1.2 : 1.0)
                    .animation(.easeInOut(duration: 0.1), value: isPulsing)
                
                Text(String(format: "%.1fs", timeLeft))
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundColor(.white)
            }
            
            Button(action: toggleCadence) {
                Text(isActive ? "PARAR" : "INICIAR 8s")
                    .font(.system(size: 12, weight: .heavy))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(isActive ? Color.red : Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 4)
        .onDisappear {
            stopCadence()
        }
    }
    
    private func toggleCadence() {
        if isActive {
            stopCadence()
        } else {
            startCadence()
        }
    }
    
    private func startCadence() {
        timeLeft = 8.0
        isActive = true
        
        let interval = 1.0 / repsPerSecond
        
        // Haptic beat timer
        hapticTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { _ in
            WatchHapticManager.shared.playCadenceTick()
            isPulsing = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
                isPulsing = false
            }
        }
        
        // Countdown timer
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            if timeLeft > 0.1 {
                timeLeft -= 0.1
            } else {
                stopCadence()
                WatchHapticManager.shared.playRestTimerFinished()
            }
        }
    }
    
    private func stopCadence() {
        isActive = false
        timer?.invalidate()
        hapticTimer?.invalidate()
        timer = nil
        hapticTimer = nil
        isPulsing = false
    }
}
