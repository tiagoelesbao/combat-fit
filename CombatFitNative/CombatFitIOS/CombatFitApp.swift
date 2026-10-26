//
//  CombatFitApp.swift
//  CombatFitIOS
//  Ponto de Entrada do Aplicativo Nativo para iPhone
//

import SwiftUI

@main
struct CombatFitApp: App {
    var body: some Scene {
        WindowGroup {
            DashboardView()
                .preferredColorScheme(.dark)
        }
    }
}
