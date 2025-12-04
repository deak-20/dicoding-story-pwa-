import L from 'leaflet';

/**
 * Create custom marker icon using CSS
 * This solves the Webpack bundling issue with Leaflet default icons
 */
export const createStoryMarker = () => {
  return L.divIcon({
    html: `
      <div class="custom-marker-pin">
        <div class="custom-marker-icon">📍</div>
      </div>
    `,
    className: 'custom-marker-wrapper',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

/**
 * Create highlighted/active marker icon
 */
export const createActiveMarker = () => {
  return L.divIcon({
    html: `
      <div class="custom-marker-pin active">
        <div class="custom-marker-icon">📍</div>
      </div>
    `,
    className: 'custom-marker-wrapper',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

/**
 * Create marker for add story page (different style)
 */
export const createLocationMarker = () => {
  return L.divIcon({
    html: `
      <div class="custom-marker-pin location">
        <div class="custom-marker-icon">📌</div>
      </div>
    `,
    className: 'custom-marker-wrapper',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

export default createStoryMarker;