import React, { useEffect, useState, useRef } from 'react';
import Globe from 'react-globe.gl';
import { cn } from '@/lib/utils';

interface GlobePoint {
  lat: number;
  lng: number;
  size: number;
  region: string;
  color: string;
  co2: number;
  ecoScore: number;
}

interface GlobeCardProps {
  level: 'low' | 'medium' | 'high';
  onRegionSelect: (region: string) => void;
  selectedRegion: string;
}

const REGION_POINTS: GlobePoint[] = [
  { lat: 47.6062, lng: -122.3321, size: 0.6, region: 'North America', color: '#dc2626', co2: 120.2, ecoScore: 40 },
  { lat: 51.5074, lng: -0.1278, size: 0.5, region: 'Europe', color: '#d97706', co2: 62.4, ecoScore: 69 },
  { lat: 35.6762, lng: 139.6503, size: 0.5, region: 'Asia-Pacific', color: '#059669', co2: 35.1, ecoScore: 82 },
  { lat: 19.0760, lng: 72.8777, size: 0.6, region: 'South Asia', color: '#059669', co2: 28.5, ecoScore: 85 },
  { lat: -33.8688, lng: 151.2093, size: 0.4, region: 'Australia', color: '#d97706', co2: 55.8, ecoScore: 72 },
];

export const GlobeCard: React.FC<GlobeCardProps> = ({ level, onRegionSelect, selectedRegion }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 220 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: width || 300,
          height: height || 220,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.8;
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 1000);
    }
  }, []);

  useEffect(() => {
    if (!globeRef.current || selectedRegion === 'My Profile' || selectedRegion === 'Global') return;
    const target = REGION_POINTS.find(p => p.region === selectedRegion);
    let timer: any;
    if (target) {
      globeRef.current.controls().autoRotate = false;
      globeRef.current.pointOfView({ lat: target.lat, lng: target.lng, altitude: 1.5 }, 1200);
      timer = setTimeout(() => {
        if (globeRef.current) globeRef.current.controls().autoRotate = true;
      }, 5000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [selectedRegion]);

  return (
    <div
      ref={containerRef}
      className={cn('w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden')}
    >
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        pointsData={REGION_POINTS}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={(d: any) => d.size / 10}
        pointRadius={0.4}
        pointsMerge={true}
        onPointClick={(point: any) => {
          onRegionSelect(point.region);
        }}
        backgroundColor="rgba(0,0,0,0)"
        htmlElementsData={[]}
      />
    </div>
  );
};
