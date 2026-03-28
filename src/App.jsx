import React, { useState, useEffect } from 'react';
import { Search, MapPin, Wind, Thermometer, X, CloudRain, Sun, Cloud, CloudLightning, Snowflake, AlertCircle } from 'lucide-react';

// ==========================================
// 1. Utility Functions (Pure Functions)
// ==========================================

// แปลงรหัสสภาพอากาศ WMO เป็นข้อความภาษาไทยและไอคอน
export const getWeatherInfo = (code) => {
  if (code === 0) return { desc: 'ท้องฟ้าแจ่มใส', icon: Sun, color: 'text-yellow-400' };
  if (code >= 1 && code <= 3) return { desc: 'มีเมฆบางส่วน ถึง มืดครึ้ม', icon: Cloud, color: 'text-gray-200' };
  if (code === 45 || code === 48) return { desc: 'มีหมอก', icon: Cloud, color: 'text-gray-300' };
  if ((code >= 51 && code <= 55) || (code >= 61 && code <= 65)) return { desc: 'ฝนตก', icon: CloudRain, color: 'text-blue-300' };
  if (code >= 71 && code <= 77) return { desc: 'หิมะตก', icon: Snowflake, color: 'text-white' };
  if (code >= 95 && code <= 99) return { desc: 'พายุฝนฟ้าคะนอง', icon: CloudLightning, color: 'text-yellow-300' };
  return { desc: 'ไม่ทราบสภาพอากาศ', icon: Cloud, color: 'text-gray-200' };
};

// ตรวจสอบความถูกต้องของชื่อเมืองเบื้องต้น (ไม่ให้เป็นค่าว่าง)
export const isValidCityName = (name) => {
  return typeof name === 'string' && name.trim().length > 0;
};

// ==========================================
// 2. Unit Tests (ระบบทดสอบโค้ด 2 ชุด)
// ==========================================
const runTests = () => {
  console.log("--- เริ่มการทดสอบ (Running Unit Tests) ---");
  let passed = 0;
  let total = 0;

  const assertEqual = (name, actual, expected) => {
    total++;
    if (actual === expected) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} | คาดหวัง: ${expected}, แต่ได้: ${actual}`);
    }
  };

  // Test Suite 1: ทดสอบการแปลงรหัสสภาพอากาศ
  assertEqual('Test Suite 1.1: รหัส 0 ต้องเป็น "ท้องฟ้าแจ่มใส"', getWeatherInfo(0).desc, 'ท้องฟ้าแจ่มใส');
  assertEqual('Test Suite 1.2: รหัส 61 ต้องเป็น "ฝนตก"', getWeatherInfo(61).desc, 'ฝนตก');
  assertEqual('Test Suite 1.3: รหัส 95 ต้องเป็น "พายุฝนฟ้าคะนอง"', getWeatherInfo(95).desc, 'พายุฝนฟ้าคะนอง');

  // Test Suite 2: ทดสอบการตรวจสอบชื่อเมือง
  assertEqual('Test Suite 2.1: ชื่อเมืองว่างเปล่าต้องคืนค่า false', isValidCityName('   '), false);
  assertEqual('Test Suite 2.2: ชื่อเมืองถูกต้องต้องคืนค่า true', isValidCityName('Bangkok'), true);

  console.log(`--- สรุปผลการทดสอบ: ผ่าน ${passed}/${total} ---`);
};

// ==========================================
// 3. Main React Component
// ==========================================
export default function App() {
  const [cities, setCities] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // รัน Unit Tests เมื่อคอมโพเนนต์ถูกโหลดครั้งแรก
  useEffect(() => {
    runTests();
  }, []);

  // ฟังก์ชันดึงข้อมูลสภาพอากาศ
  const fetchWeather = async (e) => {
    e.preventDefault();
    if (!isValidCityName(searchTerm)) {
      setError('กรุณาระบุชื่อเมือง');
      return;
    }

    const cityName = searchTerm.trim();
    
    // ตรวจสอบว่ามีการค้นหาเมืองนี้ไปแล้วหรือไม่ (Case-insensitive)
    if (cities.some(c => c.name.toLowerCase() === cityName.toLowerCase())) {
      setError('เมืองนี้ถูกเพิ่มในรายการแล้ว');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Geocoding API: ค้นหาพิกัด (Lat, Lon) จากชื่อเมือง
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
      if (!geoRes.ok) throw new Error('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ (Geocoding)');
      
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        throw new Error('ไม่พบข้อมูลเมืองที่คุณค้นหา กรุณลองใหม่อีกครั้ง');
      }

      const location = geoData.results[0];
      const { latitude, longitude, name, country } = location;

      // 2. Weather API: ดึงสภาพอากาศจากพิกัด
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
      if (!weatherRes.ok) throw new Error('เกิดข้อผิดพลาดในการดึงข้อมูลสภาพอากาศ');
      
      const weatherData = await weatherRes.json();
      const current = weatherData.current_weather;

      // สร้างอ็อบเจกต์เมืองใหม่และอัปเดต State (รองรับการแสดงผลหลายเมือง)
      const newCity = {
        id: `${latitude}-${longitude}-${Date.now()}`,
        name: name,
        country: country || '',
        temperature: current.temperature,
        windspeed: current.windspeed,
        weatherCode: current.weathercode,
        time: current.time
      };

      setCities(prev => [newCity, ...prev]);
      setSearchTerm('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ลบเมืองออกจากรายการ
  const removeCity = (id) => {
    setCities(cities.filter(city => city.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-indigo-900 p-6 font-sans text-gray-800">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <CloudRain className="w-12 h-12" />
            Weather Explorer
          </h1>
          <p className="text-blue-200">ค้นหาสภาพอากาศทั่วโลกได้แบบเรียลไทม์</p>
        </div>

        {/* Search Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl mb-8 border border-white/20">
          <form onSubmit={fetchWeather} className="flex gap-3 relative">
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="พิมพ์ชื่อเมือง (เช่น Bangkok, London, Tokyo)..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white/90 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-lg shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-400 text-white px-8 rounded-xl font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span className="hidden sm:inline">ค้นหา</span>
                </>
              )}
            </button>
          </form>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-100 animate-pulse">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Cities Grid */}
        {cities.length === 0 && !isLoading && !error && (
          <div className="text-center text-blue-200 mt-16 bg-white/5 rounded-2xl p-10 border border-white/10 backdrop-blur-sm">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">ยังไม่มีข้อมูลเมือง ลองค้นหาเมืองที่คุณสนใจดูสิ!</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cities.map((city) => {
            const { desc, icon: WeatherIcon, color } = getWeatherInfo(city.weatherCode);
            
            return (
              <div 
                key={city.id} 
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 relative group hover:bg-white/15 transition-all duration-300"
              >
                <button
                  onClick={() => removeCity(city.id)}
                  className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/20 hover:bg-red-500/80 rounded-full p-1 transition-colors"
                  title="ลบเมืองนี้"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      {city.name}
                    </h2>
                    <p className="text-blue-200 text-sm mt-1">{city.country}</p>
                  </div>
                  <div className={`p-3 bg-white/10 rounded-2xl shadow-inner ${color}`}>
                    <WeatherIcon className="w-10 h-10" />
                  </div>
                </div>

                <div className="flex items-end gap-2 mb-6">
                  <span className="text-6xl font-black text-white">{city.temperature}°</span>
                  <span className="text-xl text-blue-200 mb-2">C</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/20 rounded-xl p-3 flex items-center gap-3 border border-white/5">
                    <Cloud className="w-5 h-5 text-blue-300" />
                    <div>
                      <p className="text-xs text-blue-200">สภาพอากาศ</p>
                      <p className="text-sm font-semibold text-white">{desc}</p>
                    </div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-3 flex items-center gap-3 border border-white/5">
                    <Wind className="w-5 h-5 text-blue-300" />
                    <div>
                      <p className="text-xs text-blue-200">ความเร็วลม</p>
                      <p className="text-sm font-semibold text-white">{city.windspeed} km/h</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
