import pool from '../config/database.js';

const Documents = {
  // ✅ Get all documents
  getAll: async () => {
    const [rows] = await pool.query('SELECT * FROM documents');
    return rows;
  },

  // ✅ Get document by ID
  getById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM documents WHERE document_id = ?', [id]);
    return rows[0];
  },

  // ✅ Create new document
  create: async (data) => {
    const {
      url,
      doc_type,
      is_accepted = 0,
      uploaded_by,
      bus_id,
      reviewed_by = null
    } = data;

    const [result] = await pool.query(
      `INSERT INTO documents 
        (url, doc_type, is_accepted, uploaded_by, bus_id, uploaded_at, reviewed_by, reviewed_at)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW())`,
      [url, doc_type, is_accepted, uploaded_by, bus_id, reviewed_by]
    );

    return result.insertId; // return new document ID
  },

  // ✅ Update document (e.g., mark as accepted/reviewed)
  update: async (id, data) => {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    values.push(id);

    const [result] = await pool.query(
      `UPDATE documents 
       SET ${fields.join(', ')}, reviewed_at = NOW() 
       WHERE document_id = ?`,
      values
    );

    return result.affectedRows;
  },

  // ✅ Delete document (optional)
  delete: async (id) => {
    const [result] = await pool.query('DELETE FROM documents WHERE document_id = ?', [id]);
    return result.affectedRows;
  }
};

export default Documents;
