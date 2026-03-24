/**
 * API Bridge for Sensor Data
 * Sends heart rate data to backend API
 */

class SensorAPI {
    constructor(apiUrl = 'http://localhost:5000') {
        this.apiUrl = apiUrl;
    }

    async sendHeartRate(data) {
        try {
            const response = await fetch(`${this.apiUrl}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    hr: data.hr,
                    spo2: 98, // Default values for sensor-only input
                    temp: 36.5,
                    ecg: 'normal',
                    emotion: 'normal',
                    voice_sentiment: 'normal',
                    timestamp: data.timestamp
                })
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('Error sending data to API:', error);
            throw error;
        }
    }

    async sendToFrontend(data, callback) {
        // For direct frontend integration
        if (callback) {
            callback(data);
        }

        // Also send to API
        try {
            const result = await this.sendHeartRate(data);
            return result;
        } catch (error) {
            // Fallback: just return sensor data
            return {
                sensor_data: data,
                error: error.message
            };
        }
    }
}

// Utility functions
function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString();
}

function validateHeartRate(hr) {
    return hr >= 40 && hr <= 200;
}

export { SensorAPI, formatTimestamp, validateHeartRate };