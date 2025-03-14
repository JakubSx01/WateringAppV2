const API_URL = process.env.REACT_APP_API_URL;

const UserPlantItem = ({ plant, onWater }) => (
  <li>
    {plant.plant.name} - {plant.next_watering_date}
    {plant.plant.image 
      ? <img src={`${API_URL}${plant.plant.image}`} alt={plant.plant.name} width="50" />
      : <p>(Brak zdjęcia)</p>}
    <button onClick={() => onWater(plant.id)}>Podlej roślinę</button>
  </li>
);

export default UserPlantItem;
