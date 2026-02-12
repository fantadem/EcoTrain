import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmark, setBookmark] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  // Nouveaux états pour les filtres
  const [selectedClass, setSelectedClass] = useState('second'); // 'second' ou 'first'
  const [maxPrice, setMaxPrice] = useState('200');

  const station_departure = searchParams.get('departure');
  const station_arrival = searchParams.get('arrival');
  const date = searchParams.get('date');
  const time = searchParams.get('time');

  // Charger les trajets depuis CouchDB
  const loadTrips = async (append = false, nextBookmark = null) => {
    setLoading(true);
    try {
      const datetime_departure = `${date}T${time}:00+02:00`;
      
      const query = {
        selector: {
          station_departure,
          station_arrival,
          datetime_departure: { $gte: datetime_departure }
        },
        limit: 10
      };

      if (nextBookmark) {
        query.bookmark = nextBookmark;
      }

      const response = await fetch('http://localhost:5984/ecotrain/_find', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('admin:admin')
        },
        body: JSON.stringify(query)
      });

      const data = await response.json();
      const newTrips = data.docs || [];

      if (append) {
        setTrips(prev => [...prev, ...newTrips]);
      } else {
        setTrips(newTrips);
      }

      setBookmark(data.bookmark);
      setHasMore(newTrips.length === 10);
    } catch (error) {
      console.error('Erreur lors du chargement des trajets:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage ou quand les paramètres changent
  useEffect(() => {
    if (station_departure && station_arrival && date && time) {
      loadTrips(false, null);
    }
  }, [station_departure, station_arrival, date, time]);

  // Appliquer les filtres quand trips ou filtres changent
  useEffect(() => {
    applyFilters();
  }, [trips, selectedClass, maxPrice]);

  // Fonction pour appliquer les filtres
  const applyFilters = () => {
    const priceField = selectedClass === 'second' ? 'price_second' : 'price_first';
    const max = parseInt(maxPrice);
    
    const filtered = trips.filter(trip => {
      const price = parseInt(trip[priceField]);
      return price <= max;
    });
    
    setFilteredTrips(filtered);
  };

  // Charger plus de résultats
  const loadMore = () => {
    if (hasMore && bookmark && !loading) {
      loadTrips(true, bookmark);
    }
  };

  const formatDateTime = (datetime) => {
    const date = new Date(datetime);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="container">
      <h1>Résultats de recherche</h1>
      <p>
        De <strong>{station_departure}</strong> à <strong>{station_arrival}</strong>
      </p>

      {/* Zone de filtrage */}
      <div style={{
        background: '#f0f0f0',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <h3 style={{ marginTop: 0 }}>Filtres</h3>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '15px' }}>
            <input
              type="radio"
              name="class"
              value="second"
              checked={selectedClass === 'second'}
              onChange={(e) => setSelectedClass(e.target.value)}
            />
            {' '}2ème classe
          </label>
          <label>
            <input
              type="radio"
              name="class"
              value="first"
              checked={selectedClass === 'first'}
              onChange={(e) => setSelectedClass(e.target.value)}
            />
            {' '}1ère classe
          </label>
        </div>

        <div>
          <label>
            Prix maximum :{' '}
            <select 
              value={maxPrice} 
              onChange={(e) => setMaxPrice(e.target.value)}
            >
              <option value="30">30€</option>
              <option value="50">50€</option>
              <option value="75">75€</option>
              <option value="100">100€</option>
              <option value="150">150€</option>
              <option value="200">200€</option>
            </select>
          </label>
        </div>

        <p style={{ 
          marginTop: '10px', 
          marginBottom: 0, 
          fontSize: '0.9em',
          color: '#666'
        }}>
          {filteredTrips.length} trajet{filteredTrips.length > 1 ? 's' : ''} trouvé{filteredTrips.length > 1 ? 's' : ''}
        </p>
      </div>

      {loading && trips.length === 0 ? (
        <p>Chargement...</p>
      ) : filteredTrips.length === 0 ? (
        <p>Aucun trajet ne correspond à vos critères.</p>
      ) : (
        <>
          <div className="trip-list">
            {filteredTrips.map((trip) => (
              <div key={trip._id} className="trip-card">
                <div className="trip-info">
                  <div>
                    <strong>Départ :</strong> {formatDateTime(trip.datetime_departure)}
                  </div>
                  <div>
                    <strong>Arrivée :</strong> {formatDateTime(trip.datetime_arrival)}
                  </div>
                  <div>
                    <strong>Durée :</strong> {trip.duration}
                  </div>
                  <div>
                    <strong>Prix ({selectedClass === 'second' ? '2ème' : '1ère'} classe) :</strong>{' '}
                    {selectedClass === 'second' ? trip.price_second : trip.price_first}€
                  </div>
                </div>
                <div className="trip-actions">
                  <Link to={`/trips/${trip._id}`} className="button">
                    Voir détails
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {hasMore && (
            <button 
              onClick={loadMore} 
              disabled={loading}
              style={{ marginTop: '20px' }}
            >
              {loading ? 'Chargement...' : 'Charger plus de trajets'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
