import 'dart:async';
import 'dart:convert';
import '../services/api_service.dart';
import '../constants/config.dart';

class SonicCascadeService {
  // Logic to "play" the data as audio tones
  // For the demo, we use 18kHz and 20kHz frequencies
  static Future<void> transmitData(double lat, double lng) async {
    final payload = {'lat': lat, 'lng': lng, 'ts': DateTime.now().millisecondsSinceEpoch};
    String dataString = jsonEncode(payload);
    
    // Simulate the acoustic encoding delay
    print('SONIC CASCADE: Encoding data into 18kHz/20kHz tones...');
    await Future.delayed(const Duration(milliseconds: 500));
    print('SONIC CASCADE: Transmitting: $dataString');
  }

  // The Relay logic: This is what the "Online" phone calls when it hears the tones
  static Future<Map<String, dynamic>> relayReceivedSignal(String receivedJson) async {
    final data = jsonDecode(receivedJson);
    
    return await ApiService.submitSos(
      lat: data['lat'],
      lng: data['lng'],
      message: "RELAYED VIA SONIC CASCADE",
      source: Config.sourceSonicCascade, // Must be exact
      metadata: {"relay_ts": DateTime.now().millisecondsSinceEpoch}
    );
  }
}