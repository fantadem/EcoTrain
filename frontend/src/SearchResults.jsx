import { Link, useLocation, useNavigate } from 'react-router'
import { useState, useEffect, useMemo } from 'react'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import dayjs from 'dayjs'

dayjs.extend(localizedFormat);

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => Object.fromEntries(new URLSearchParams(search)), [search]);
}

function SearchResults({}) {
  const [results, setResults] = useState([])
  const [bookmark, setBookmark] = useState(null) // Nouveau : stocker le bookmark
  const [hasMore, setHasMore] = useState(false) //  Nouveau : savoir s'il y a plus de résultats
  const [loading, setLoading] = useState(false) //  Nouveau : état de chargement
  
  const query = useQuery();
  const navigate = useNavigate();
  const passengers = Math.max(1, parseInt(query.passengers || '1', 10));

  const stations = useMemo(() => ([
    'Paris',
    'Nogent-sur-Seine',
    'Romilly-sur-Seine',
    'Troyes',
  ]), []);

  const [form, setForm] = useState({
    departureStation: query.departure || '',
    arrivalStation: query.arrival || '',
    date: query.date || '2025-01-01',
    departureTime: query.time || '00h',
  });

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  const onSubmit = (e) => {
    e.preventDefault();
    if (!stations.includes(form.departureStation) || !stations.includes(form.arrivalStation)) {
      alert('Veuillez sélectionner des gares valides dans la liste.');
      return;
    }
    const passengers = query.passengers || '1';
    const params = new URLSearchParams({
      departure: form.departureStation,
      arrival: form.arrivalStation,
      date: form.date,
      time: form.departureTime,
      passengers,
    }).toString();
    navigate(`/trips?${params}`);
  }

  //  Fonction pour charger les trajets avec pagination
  const loadTrips = (append = false, nextBookmark = null) => {
    setLoading(true);
    
    const dep = (query.departure || '').trim();
    const arr = (query.arrival || '').trim();
    
    // Construire la requête Mango
    const mangoQuery = {
      selector: {
        station_departure: dep,
        station_arrival: arr,
      },
      limit: 10, //  Limiter à 10 résultats
    };
    
    // Si on a un bookmark (page suivante), l'ajouter
    if (nextBookmark) {
      mangoQuery.bookmark = nextBookmark;
    }
    
    // Si on a une date/heure, ajouter le filtre
    if (query.date && query.time) {
      const hour = parseInt(query.time);
      const dt = dayjs(query.date).hour(isNaN(hour) ? 0 : hour).minute(0).second(0);
      if (dt.isValid()) {
        mangoQuery.selector.datetime_departure = {
          "$gte": dt.toISOString()
        };
      }
    }

    fetch('http://localhost:5984/ecotrain/_find', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mangoQuery),
    })
      .then(x => x.json())
      .then(data => {
        // Ajouter ou remplacer les résultats
        if (append) {
          setResults(prev => [...prev, ...data.docs]);
        } else {
          setResults(data.docs);
        }
        
        // Stocker le bookmark pour la page suivante
        setBookmark(data.bookmark);
        
        // Vérifier s'il y a encore des résultats
        // Si on a reçu moins de 10 résultats, c'est la dernière page
        setHasMore(data.docs.length === 10);
        setLoading(false);
      })
      .catch(error => {
        console.error('Erreur lors du chargement des données:', error);
        setLoading(false);
      });
  };

  //  Charger les premiers résultats quand les paramètres changent
  useEffect(() => {
    if (query.departure && query.arrival) {
      loadTrips(false, null);
    }
  }, [query.departure, query.arrival, query.date, query.time]);

  //  Fonction pour charger plus de résultats
  const loadMore = () => {
    if (bookmark && !loading) {
      loadTrips(true, bookmark);
    }
  };

  return (
    <section className="container">
      <section className="container" style={{ paddingTop: 0, paddingBottom: '0.5rem' }}>
        <form className="search-bar" onSubmit={onSubmit}>
          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr'}}>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <select name="departureStation" required value={form.departureStation} onChange={onChange} style={{ width: '100%' }}>
                <option value="" disabled>Gare de départ</option>
                {stations.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select name="arrivalStation" required value={form.arrivalStation} onChange={onChange} style={{ width: '100%' }}>
                <option value="" disabled>Gare d'arrivée</option>
                {stations.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              <input type="date" name="date" required value={form.date} onChange={onChange} style={{ width: '100%' }} />
              <select name="departureTime" required value={form.departureTime} onChange={onChange} style={{ width: '100%' }}>
                <option value="">Heure de départ</option>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={`${i.toString().padStart(2, '0')}h`}>
                    {i.toString().padStart(2, '0')}h
                  </option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="outline">Mettre à jour</button>
            </div>
          </div>
        </form>
      </section>
      <h2>Voyages trouvés :</h2>
      {results.length === 0 && !loading && (<p>Aucun trajet ne correspond à votre recherche.</p>)}
      {results.map((x) => <SearchResult {...x} key={x._id} passengers={passengers} />)}
      
      {/* 📌 Bouton "Charger plus" */}
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button 
            onClick={loadMore} 
            disabled={loading}
            className="outline"
          >
            {loading ? 'Chargement...' : 'Charger plus de trajets'}
          </button>
        </div>
      )}
    </section>
  )
}

function SearchResult({_id, datetime_arrival, datetime_departure, station_arrival, station_departure, price_second, passengers}) {
  const datetimearrival = dayjs(datetime_arrival);
  const datetimedeparture = dayjs(datetime_departure);
  const durationInMinutes = datetimearrival.diff(datetimedeparture, 'minute');

  const hours = Math.floor(durationInMinutes / 60);
  const minutes = durationInMinutes % 60;
  const formattedDuration = `${hours}h${minutes.toString().padStart(2, '0')}`;
  const perPassenger = Number(price_second ?? 0);
  const totalAllPassengers = perPassenger * Math.max(1, parseInt(passengers || 1, 10));

  return (
    <article>
      <section className="container">
        <div className="grid">
          <div>
            <time> {datetimedeparture.format('HH:mm')} </time>
            <br />
            <time> {datetimearrival.format('HH:mm')} </time>
            <br />
            <time>Durée : {formattedDuration}</time>
          </div>
          <div>
            <span> {station_departure} </span>
            <br />
            <span> {station_arrival} </span>
          </div>
          <div>
            <div style={{ marginBottom: '0.25rem', fontWeight: 700, fontSize: '1.1rem' }}>
              Total pour {passengers} passager{passengers > 1 ? 's' : ''} : {totalAllPassengers}€
            </div>
            <Link to={`${_id}?passengers=${(new URLSearchParams(window.location.search)).get('passengers') || '1'}`}>
              <button className="outline">À partir de {perPassenger}€ / passager</button>
            </Link>
          </div>
        </div>
      </section >
    </article >
  )
}

export default SearchResults;
