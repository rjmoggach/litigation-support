'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
    listPersonAddressesApiV1ContactsPeoplePersonIdAddressesGet,
    createPersonAddressApiV1ContactsPeoplePersonIdAddressesPost,
    updatePersonAddressApiV1ContactsPeoplePersonIdAddressesAddressIdPut,
    deletePersonAddressApiV1ContactsPeoplePersonIdAddressesAddressIdDelete,
} from '@/lib/api'
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { formatLocalDate, parseLocalDate } from '@/lib/date-utils'

interface Address {
    id: number
    person_id: number
    address_type: string
    street_address: string
    city: string
    state_province?: string
    postal_code?: string
    country: string
    is_primary?: boolean
    created_at?: string
    updated_at?: string
}

interface PersonAddressesProps {
    personId: number
    session: { accessToken?: string } | null
    onUpdate: () => void
}

export function PersonAddresses({
    personId,
    session,
    onUpdate,
}: PersonAddressesProps) {
    const [addresses, setAddresses] = useState<Address[]>([])
    const [loading, setLoading] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingAddress, setEditingAddress] = useState<Address | null>(null)

    const fetchAddresses = useCallback(async () => {
        if (!session?.accessToken) return

        setLoading(true)
        try {
            const response = await listPersonAddressesApiV1ContactsPeoplePersonIdAddressesGet({
                path: { person_id: personId },
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            if (response.data) {
                setAddresses(response.data)
            }
        } catch (error) {
            console.error('Failed to fetch addresses:', error)
        } finally {
            setLoading(false)
        }
    }, [personId, session?.accessToken])

    useEffect(() => {
        fetchAddresses()
    }, [fetchAddresses])

    const handleDeleteAddress = async (addressId: number) => {
        if (!session?.accessToken) return

        try {
            await deletePersonAddressApiV1ContactsPeoplePersonIdAddressesAddressIdDelete({
                path: { person_id: personId, address_id: addressId },
                headers: {
                    Authorization: `Bearer ${session.accessToken}`,
                },
            })

            toast.success('Address deleted successfully')
            fetchAddresses()
            onUpdate()
        } catch (error) {
            console.error('Failed to delete address:', error)
            toast.error('Failed to delete address')
        }
    }

    const handleCreateAddress = () => {
        setEditingAddress(null)
        setIsDialogOpen(true)
    }

    const handleEditAddress = (address: Address) => {
        setEditingAddress(address)
        setIsDialogOpen(true)
    }

    const handleSaveAddress = async (addressData: Partial<Address>) => {
        if (!session?.accessToken) return

        try {
            if (editingAddress?.id) {
                await updatePersonAddressApiV1ContactsPeoplePersonIdAddressesAddressIdPut({
                    path: { person_id: personId, address_id: editingAddress.id },
                    body: addressData,
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                })
                toast.success('Address updated successfully')
            } else {
                await createPersonAddressApiV1ContactsPeoplePersonIdAddressesPost({
                    path: { person_id: personId },
                    body: { ...addressData, person_id: personId },
                    headers: {
                        Authorization: `Bearer ${session.accessToken}`,
                    },
                })
                toast.success('Address created successfully')
            }
            
            setIsDialogOpen(false)
            setEditingAddress(null)
            fetchAddresses()
            onUpdate()
        } catch (error) {
            console.error('Failed to save address:', error)
            toast.error('Failed to save address')
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Addresses ({addresses.length})
                </Label>
                <Button variant="outline" size="sm" onClick={handleCreateAddress}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Address
                </Button>
            </div>
            
            {loading ? (
                <div className="text-sm text-muted-foreground">Loading addresses...</div>
            ) : addresses.length === 0 ? (
                <div className="text-sm text-muted-foreground">No addresses recorded</div>
            ) : (
                <div className="space-y-2">
                    {addresses.map((address) => (
                        <div
                            key={address.id}
                            className="group border rounded-sm p-3"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">
                                            {address.address_type.charAt(0).toUpperCase() + address.address_type.slice(1)}
                                        </span>
                                        {address.is_primary && (
                                            <Badge
                                                variant="default"
                                                className="text-xs bg-blue-600 hover:bg-blue-700"
                                            >
                                                Primary
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        <div>{address.street_address}</div>
                                        <div>
                                            {address.city}
                                            {address.state_province && `, ${address.state_province}`}
                                            {address.postal_code && ` ${address.postal_code}`}
                                        </div>
                                        <div>{address.country}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                        title="Edit address"
                                        onClick={() => handleEditAddress(address)}
                                    >
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                                        title="Delete address"
                                        onClick={() => handleDeleteAddress(address.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <AddressDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                address={editingAddress}
                onSave={handleSaveAddress}
            />
        </div>
    )
}

// Simple Address Dialog Component
interface AddressDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    address: Address | null
    onSave: (data: Partial<Address>) => void
}

function AddressDialog({ open, onOpenChange, address, onSave }: AddressDialogProps) {
    const [formData, setFormData] = useState({
        address_type: 'home',
        street_address: '',
        city: '',
        state_province: '',
        postal_code: '',
        country: 'US',
        is_primary: false,
    })

    useEffect(() => {
        if (address) {
            setFormData({
                address_type: address.address_type || 'home',
                street_address: address.street_address || '',
                city: address.city || '',
                state_province: address.state_province || '',
                postal_code: address.postal_code || '',
                country: address.country || 'US',
                is_primary: address.is_primary || false,
            })
        } else {
            setFormData({
                address_type: 'home',
                street_address: '',
                city: '',
                state_province: '',
                postal_code: '',
                country: 'US',
                is_primary: false,
            })
        }
    }, [address, open])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSave(formData)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{address ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label htmlFor="address_type">Address Type</Label>
                        <Select value={formData.address_type} onValueChange={(value) => setFormData(prev => ({ ...prev, address_type: value }))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="home">Home</SelectItem>
                                <SelectItem value="work">Work</SelectItem>
                                <SelectItem value="mailing">Mailing</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <div>
                        <Label htmlFor="street_address">Street Address</Label>
                        <Input
                            id="street_address"
                            value={formData.street_address}
                            onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                            placeholder="Enter street address"
                            required
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label htmlFor="city">City</Label>
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                                placeholder="City"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="state_province">State</Label>
                            <Input
                                id="state_province"
                                value={formData.state_province}
                                onChange={(e) => setFormData(prev => ({ ...prev, state_province: e.target.value }))}
                                placeholder="State"
                            />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label htmlFor="postal_code">Postal Code</Label>
                            <Input
                                id="postal_code"
                                value={formData.postal_code}
                                onChange={(e) => setFormData(prev => ({ ...prev, postal_code: e.target.value }))}
                                placeholder="Postal Code"
                            />
                        </div>
                        <div>
                            <Label htmlFor="country">Country</Label>
                            <Select value={formData.country} onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="US">United States</SelectItem>
                                    <SelectItem value="CA">Canada</SelectItem>
                                    <SelectItem value="GB">United Kingdom</SelectItem>
                                    <SelectItem value="AU">Australia</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="is_primary"
                                checked={formData.is_primary}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                                className="rounded"
                            />
                            <Label htmlFor="is_primary">Primary address</Label>
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {address ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}