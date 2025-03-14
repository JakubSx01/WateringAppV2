const UserPlantItem = ({ plant, onWater }) => (
    <li>
      {plant.plant.name} - {plant.next_watering_date}
      <button onClick={() => onWater(plant.id)}>Podlej roślinę</button>
    </li>
  );
  
  export default UserPlantItem;
  