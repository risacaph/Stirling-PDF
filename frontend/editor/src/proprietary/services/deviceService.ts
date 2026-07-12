import apiClient from "@app/services/apiClient";

/** One device registered against the current user's account. */
export interface DeviceInfo {
  id: number;
  label: string | null;
  createdAt: string | null;
  lastSeenAt: string | null;
  /** Whether this is the device the request came from. */
  current: boolean;
}

export interface DevicesResponse {
  maxDevices: number;
  devices: DeviceInfo[];
}

/**
 * The signed-in user's device activations. Devices count toward the plan's device limit; removing
 * one frees a slot for a new sign-in.
 */
export const deviceService = {
  async getDevices(): Promise<DevicesResponse> {
    const response = await apiClient.get<DevicesResponse>(
      "/api/v1/user/devices",
    );
    return response.data;
  },

  async revokeDevice(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/user/devices/${id}`, {
      suppressErrorToast: true,
    });
  },
};
