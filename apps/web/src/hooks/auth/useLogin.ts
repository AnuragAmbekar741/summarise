import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { login } from '@/api/auth/auth.api';
import { getErrorMessage } from '@/api/error.utils';
import { CURRENT_USER_KEY } from '@/hooks/user/useCurrentUser';

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: login,
    onSuccess: ({ user }) => {
      queryClient.setQueryData(CURRENT_USER_KEY, user);
      navigate('/', { replace: true });
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
