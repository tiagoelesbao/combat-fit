//
//  WatchRestTimerView.swift
//  CombatFitWatch
//  Cronômetro de Descanso com Vibração no Pulso (Taptic Engine)
//

import SwiftUI

struct WatchRestTimerView: View {
    @Binding var secondsRemaining: Int
    @Binding var isPresented: Bool
    
    @State private var totalDuration: Int = 90
    @State private var timer: Timer?
    
    var progress: Double {
        guard totalDuration > 0 else { return 0 }
        return Double(secondsRemaining) / Double(totalDuration)
    }
    
    var body: some View {
        VStack(spacing: 6) {
            Text("DESCANSO")
                .font(.system(size: 10, weight: .black))
                .foregroundColor(.orange)
            
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.15), lineWidth: 6)
                
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(
                        Color.orange,
                        style: StrokeStyle(lineWidth: 6, lineCap: .round)
                    )
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 1.0), value: progress)
                
                VStack(spacing: 0) {
                    Text("\(secondsRemaining)")
                        .font(.system(size: 30, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                    Text("segundos")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundColor(.gray)
                }
            }
            .frame(width: 88, height: 88)
            .padding(.vertical, 4)
            
            HStack(spacing: 8) {
                Button("+30s") {
                    secondsRemaining += 30
                    totalDuration += 30
                }
                .font(.system(size: 11, weight: .bold))
                
                Button("Pular") {
                    stopAndDismiss()
                }
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(.red)
            }
        }
        .onAppear {
            totalDuration = max(secondsRemaining, 1)
            startCountdown()
        }
        .onDisappear {
            timer?.invalidate()
        }
    }
    
    private func startCountdown() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            if secondsRemaining > 0 {
                secondsRemaining -= 1
                
                if secondsRemaining <= 3 && secondsRemaining > 0 {
                    WatchHapticManager.shared.playCountdownTick()
                }
            } else {
                timer?.invalidate()
                WatchHapticManager.shared.playRestTimerFinished()
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) {
                    isPresented = false
                }
            }
        }
    }
    
    private func stopAndDismiss() {
        timer?.invalidate()
        isPresented = false
    }
}
