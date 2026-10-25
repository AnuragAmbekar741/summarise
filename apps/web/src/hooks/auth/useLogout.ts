import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { logout } from '@/api/auth/auth.api';
import { getErrorMessage } from '@/api/error.utils';
import { CURRENT_USER_KEY } from '@/hooks/user/useCurrentUser';

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(CURRENT_USER_KEY, null);
      navigate('/login', { replace: true });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
