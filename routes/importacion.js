const express = require('express');
const router = express.Router();
const pool = require('../db');
const cors = require('cors');

// Habilita CORS para todas las rutas
router.use(cors());

// Obtener todos los importacion
router.get('/', async (req, res) => {
    try {
        // Consultar maestro
        const masterQuery = 'SELECT id,created_at,updated_at,month,cupo_asignado,status,cupo_restante,tota_solicitud,total_pesoKg,vue,importador,user_id,years,country,proveedor,send_email,grupo FROM public.importacion';
        const masterResult = await pool.query(masterQuery);
  
        if (masterResult.rows.length === 0) {
            return res.status(404).json({ message: 'Master records not found' });
        }
  
        // Consultar detalles asociados a cada maestro
        //for (let i = 0; i < masterResult.rows.length; i++) {
        //  const detailQuery = `SELECT * FROM public.importacion_detail WHERE importacion = ${masterResult.rows[i].id}`;
         // const detailResult = await pool.query(detailQuery);
         // masterResult.rows[i].details = detailResult.rows;
       // }
  
        res.json(masterResult.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
  });
  // Obtener todos los importacion por el id del importador
router.get('/:importador', async (req, res) => {
    const { importador } = req.params;
    try {

        // Consultar maestro
        const masterQuery = 'SELECT * FROM public.importacion where id = $1'; 
        const masterResult = await pool.query(masterQuery, [importador]);
  
        if (masterResult.rows.length === 0) {
            return res.status(404).json({ message: 'Master records not found' });
        }
  
        // Consultar detalles asociados a cada maestro
        for (let i = 0; i < masterResult.rows.length; i++) {
          const detailQuery = `SELECT * FROM public.importacion_detail WHERE importacion = ${masterResult.rows[i].id}`;
          const detailResult = await pool.query(detailQuery);
          masterResult.rows[i].details = detailResult.rows;
        }
      }
    
    catch (err) {

        console.error(err.message);
        res.status(500).send('Server Error');
    }
  });


//Trae solo el total de la solicitud de importacion para calcular el cupo restate
router.get('/cuposolicitud/:importador', async (req, res) => {
    const { importador } = req.params;
    try {
        const { rows } = await pool.query('SELECT COALESCE(sum(tota_solicitud), 0) as total_solicitud FROM public.importacion WHERE importador = $1', [importador]);      if (rows.length === 0) {
        return res.status(404).json({ msg: 'Importacion no encontrada' });
      }
      res.json(rows[0]);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Error del servidor');
    }});

router.post('/', async (req, res) => {
  const body = req.body;    
  try {
    // Iniciar transacción
    await pool.query('BEGIN');

    // Insertar en la tabla maestra
    const masterInsert = 'INSERT INTO public.importacion(authorization_date, month, cupo_asignado, status, cupo_restante, tota_solicitud, total_pesokg, vue, data_file, importador, years, country, proveedor, grupo, importador_id) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,$15) RETURNING id';
    const masterValues = [body.authorization_date, body.month, body.cupo_asignado, body.status, body.cupo_restante, body.tota_solicitud, body.total_pesokg, body.vue, body.data_file, body.importador, body.years, body.pais, body.proveedor, body.grupo, body.importador_id];
    const masterResult = await pool.query(masterInsert, masterValues);

    // Insertar en la tabla de detalles
    for (const detail of body.details) {
      const detailInsert = 'INSERT INTO public.importacion_detail(cif, fob, peso_kg, peso_pao, sustancia, subpartida, ficha_file, importacion) VALUES($1, $2, $3, $4, $5, $6, $7, $8)';
      const detailValues = [detail.cif, detail.fob, detail.peso_kg, detail.pao, detail.sustancia, detail.subpartida, detail.ficha_file, masterResult.rows[0].id];
      await pool.query(detailInsert, detailValues);
    }

    await pool.query('COMMIT');
    res.status(201).send('Importación creada con éxito');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Error del servidor');
  }
});

// Establecer el mecanismo para delete por id con el método DELETE master y detail
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try
  {
    await pool.query('BEGIN');
    await pool.query('DELETE FROM public.importacion_detail WHERE importacion = $1', [id]);
    await pool.query('DELETE FROM public.importacion WHERE id = $1', [id]);
    await pool.query('COMMIT');
    res.json(`Importación ${id} eliminada con éxito`);
  }
  catch (err
  ) {
    await pool.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Error del servidor');
  }
}
);
module.exports = router;
