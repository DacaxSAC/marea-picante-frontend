import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Card,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Paper,
    Typography,
    Alert,
    Snackbar,
    TextField,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
} from '@mui/material';
import {
    LockOpen,
    Lock,
    AccountBalance,
    TrendingUp,
    TrendingDown,
    Schedule,
} from '@mui/icons-material';

const API_URL = 'http://localhost:4000/api/cash-movements';

const OpeningManager = () => {
    const [cashRegister, setCashRegister] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogType, setDialogType] = useState(''); // 'open' or 'close'
    const [formData, setFormData] = useState({
        openingBalance: '',
        closingBalance: '',
        notes: ''
    });
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const [dailySummary, setDailySummary] = useState(null);

    const fetchCashRegisterStatus = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/current-register`);
            if (response.ok) {
                const data = await response.json();
                setCashRegister(data.cashRegister);
            } else {
                setCashRegister(null);
            }
        } catch (error) {
            console.error('Error:', error);
            setCashRegister(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchDailySummary = useCallback(async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${API_URL}/daily-summary?date=${today}`);
            if (response.ok) {
                const data = await response.json();
                setDailySummary(data.summary);
            }
        } catch (error) {
            console.error('Error fetching daily summary:', error);
        }
    }, []);

    useEffect(() => {
        fetchCashRegisterStatus();
        fetchDailySummary();
    }, [fetchCashRegisterStatus, fetchDailySummary]);

    const handleOpenCashRegister = async () => {
        try {
            const response = await fetch(`${API_URL}/open-register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    openingBalance: parseFloat(formData.openingBalance),
                    notes: formData.notes
                })
            });

            if (!response.ok) {
                throw new Error('Error al abrir la caja');
            }

            setSnackbar({
                open: true,
                message: 'Caja abierta exitosamente',
                severity: 'success'
            });

            setOpenDialog(false);
            setFormData({ openingBalance: '', closingBalance: '', notes: '' });
            fetchCashRegisterStatus();
            fetchDailySummary();
        } catch (error) {
            console.error('Error:', error);
            setSnackbar({
                open: true,
                message: 'Error al abrir la caja',
                severity: 'error'
            });
        }
    };

    const handleCloseCashRegister = async () => {
        try {
            const response = await fetch(`${API_URL}/close-register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    closingBalance: parseFloat(formData.closingBalance),
                    notes: formData.notes
                })
            });

            if (!response.ok) {
                throw new Error('Error al cerrar la caja');
            }

            setSnackbar({
                open: true,
                message: 'Caja cerrada exitosamente',
                severity: 'success'
            });

            setOpenDialog(false);
            setFormData({ openingBalance: '', closingBalance: '', notes: '' });
            fetchCashRegisterStatus();
            fetchDailySummary();
        } catch (error) {
            console.error('Error:', error);
            setSnackbar({
                open: true,
                message: 'Error al cerrar la caja',
                severity: 'error'
            });
        }
    };

    const handleOpenDialog = (type) => {
        setDialogType(type);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData({ openingBalance: '', closingBalance: '', notes: '' });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
        }).format(amount);
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('es-CO');
    };

    return (
        <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                            <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AccountBalance />
                                Gestión de Apertura y Cierre de Caja
                            </Typography>
                            {!loading && (
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    {!cashRegister ? (
                                        <Button
                                            variant="contained"
                                            color="success"
                                            startIcon={<LockOpen />}
                                            onClick={() => handleOpenDialog('open')}
                                        >
                                            Abrir Caja
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="contained"
                                            color="error"
                                            startIcon={<Lock />}
                                            onClick={() => handleOpenDialog('close')}
                                        >
                                            Cerrar Caja
                                        </Button>
                                    )}
                                </Box>
                            )}
                        </Box>

                        {/* Estado actual de la caja */}
                        <Grid container spacing={3} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>
                                        Estado de la Caja
                                    </Typography>
                                    {loading ? (
                                        <Typography>Cargando...</Typography>
                                    ) : cashRegister ? (
                                        <Box>
                                            <Chip
                                                label="ABIERTA"
                                                color="success"
                                                sx={{ mb: 2, fontSize: '1rem', py: 2 }}
                                            />
                                            <Typography variant="body1" sx={{ mb: 1 }}>
                                                <strong>Apertura:</strong> {formatDateTime(cashRegister.openingDate)}
                                            </Typography>
                                            <Typography variant="body1" sx={{ mb: 1 }}>
                                                <strong>Balance Inicial:</strong> {formatCurrency(cashRegister.openingBalance)}
                                            </Typography>
                                            {cashRegister.notes && (
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Notas:</strong> {cashRegister.notes}
                                                </Typography>
                                            )}
                                        </Box>
                                    ) : (
                                        <Box>
                                            <Chip
                                                label="CERRADA"
                                                color="error"
                                                sx={{ mb: 2, fontSize: '1rem', py: 2 }}
                                            />
                                            <Typography variant="body2" color="text.secondary">
                                                La caja está cerrada. Debe abrirla para comenzar las operaciones.
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <Paper sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="h6" sx={{ mb: 2 }}>
                                        Resumen del Día
                                    </Typography>
                                    {dailySummary ? (
                                        <Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <TrendingUp color="success" />
                                                    Ingresos:
                                                </Typography>
                                                <Typography variant="body1" color="success.main">
                                                    {formatCurrency(dailySummary.totalIncome || 0)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <TrendingDown color="error" />
                                                    Egresos:
                                                </Typography>
                                                <Typography variant="body1" color="error.main">
                                                    {formatCurrency(dailySummary.totalExpenses || 0)}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: 1, borderColor: 'divider' }}>
                                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                    Balance:
                                                </Typography>
                                                <Typography 
                                                    variant="body1" 
                                                    sx={{ 
                                                        fontWeight: 'bold',
                                                        color: (dailySummary.totalIncome - dailySummary.totalExpenses) >= 0 ? 'success.main' : 'error.main'
                                                    }}
                                                >
                                                    {formatCurrency((dailySummary.totalIncome || 0) - (dailySummary.totalExpenses || 0))}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            No hay datos disponibles para hoy
                                        </Typography>
                                    )}
                                </Paper>
                            </Grid>
                        </Grid>

                        {/* Historial de movimientos recientes */}
                        {dailySummary && dailySummary.movements && dailySummary.movements.length > 0 && (
                            <Paper sx={{ mt: 3 }}>
                                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                    <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Schedule />
                                        Movimientos Recientes
                                    </Typography>
                                </Box>
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Hora</TableCell>
                                                <TableCell>Tipo</TableCell>
                                                <TableCell>Descripción</TableCell>
                                                <TableCell align="right">Monto</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {dailySummary.movements.slice(0, 5).map((movement) => (
                                                <TableRow key={movement.cashMovementId}>
                                                    <TableCell>
                                                        {new Date(movement.date).toLocaleTimeString('es-CO')}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            label={movement.type === 'INCOME' ? 'Ingreso' : 'Egreso'}
                                                            color={movement.type === 'INCOME' ? 'success' : 'error'}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>{movement.description}</TableCell>
                                                    <TableCell align="right">
                                                        {formatCurrency(movement.amount)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Paper>
                        )}
                    </Card>
                </Grid>
            </Grid>

            {/* Modal para abrir/cerrar caja */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {dialogType === 'open' ? (
                            <>
                                <LockOpen color="success" />
                                Abrir Caja
                            </>
                        ) : (
                            <>
                                <Lock color="error" />
                                Cerrar Caja
                            </>
                        )}
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        {dialogType === 'open' ? (
                            <TextField
                                label="Balance Inicial"
                                type="number"
                                value={formData.openingBalance}
                                onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                                fullWidth
                                required
                                inputProps={{ min: 0, step: 0.01 }}
                                helperText="Ingrese el monto inicial en caja"
                            />
                        ) : (
                            <TextField
                                label="Balance Final"
                                type="number"
                                value={formData.closingBalance}
                                onChange={(e) => setFormData({ ...formData, closingBalance: e.target.value })}
                                fullWidth
                                required
                                inputProps={{ min: 0, step: 0.01 }}
                                helperText="Ingrese el monto final contado en caja"
                            />
                        )}
                        <TextField
                            label="Notas (Opcional)"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            fullWidth
                            multiline
                            rows={3}
                            placeholder="Observaciones adicionales..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={dialogType === 'open' ? handleOpenCashRegister : handleCloseCashRegister}
                        variant="contained"
                        color={dialogType === 'open' ? 'success' : 'error'}
                        disabled={
                            dialogType === 'open' 
                                ? !formData.openingBalance 
                                : !formData.closingBalance
                        }
                    >
                        {dialogType === 'open' ? 'Abrir Caja' : 'Cerrar Caja'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar para notificaciones */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default OpeningManager;