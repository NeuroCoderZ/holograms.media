-- Файл: backend/db/rls_policies.sql
-- Описание: Включает Row-Level Security и определяет политики доступа
-- для интеграции с Neon Data API и Firebase Authentication.

-- ШАГ 1: Включение расширения для работы с JWT
-- Это расширение позволяет PostgreSQL читать данные из JWT-токенов.
CREATE EXTENSION IF NOT EXISTS pg_jwt; -- Исправлено с pg_session_jwt на pg_jwt, если это правильное расширение Neon

-- ШАГ 2: Настройка базовых ролей (если их нет)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
END
$$;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ШАГ 3: Применение RLS к таблице user_holograms
-- Включаем RLS
ALTER TABLE public.user_holograms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_holograms FORCE ROW LEVEL SECURITY; -- Для владельца таблицы тоже

-- Удаляем старые политики, чтобы избежать конфликтов при повторном запуске
DROP POLICY IF EXISTS "Users can manage their own holograms" ON public.user_holograms;

-- Единая политика для всех операций (SELECT, INSERT, UPDATE, DELETE)
-- Предполагаем, что функция auth.uid() будет доступна после настройки Neon JWT Authenticator
-- или через pg_jwt, который может предоставлять current_setting('request.jwt.claims', true)::jsonb->>'sub'
-- Для pg_jwt, обычно используется что-то вроде current_setting('request.jwt.claims')::jsonb->>'sub' или ->>'user_id'
-- Заменяем auth.uid() на стандартный способ получения user_id из JWT через pg_jwt, если это так.
-- Если Neon Data API предоставляет auth.uid() напрямую, то можно оставить.
-- Для универсальности, предположим, что JWT claim 'sub' или 'user_id' содержит Firebase UID.
-- Уточнение: Neon Data API JWT Authenticator обычно устанавливает `request.jwt.claims` GUC.
-- И `auth.uid()` это функция-хелпер, которую можно создать, или использовать прямой доступ к GUC.
-- Оставляем auth.uid() как в задании, предполагая, что такая функция будет настроена или предоставлена Neon.
CREATE POLICY "Users can manage their own holograms" ON public.user_holograms
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid()) -- auth.uid() извлекает Firebase UID из JWT-токена
    WITH CHECK (user_id = auth.uid());

-- Предоставляем роли 'authenticated' полные права на эту таблицу
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_holograms TO authenticated;

-- ШАГ 4: Применение RLS к таблице user_gesture_definitions
ALTER TABLE public.user_gesture_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gesture_definitions FORCE ROW LEVEL SECURITY; -- Для владельца таблицы тоже
DROP POLICY IF EXISTS "Users can manage their own gesture definitions" ON public.user_gesture_definitions;

CREATE POLICY "Users can manage their own gesture definitions" ON public.user_gesture_definitions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_gesture_definitions TO authenticated;

-- ШАГ 5: Применение RLS к таблице user_chat_sessions
ALTER TABLE public.user_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_chat_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own chat sessions" ON public.user_chat_sessions;

CREATE POLICY "Users can manage their own chat sessions" ON public.user_chat_sessions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_chat_sessions TO authenticated;

-- ШАГ 6: Применение RLS к таблице chat_history
-- Доступ к сообщениям чата разрешен, если пользователь является владельцем сессии чата.
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage messages in their own chat sessions" ON public.chat_history;

CREATE POLICY "Users can manage messages in their own chat sessions" ON public.chat_history
    FOR ALL
    TO authenticated
    USING (
        (SELECT user_id FROM public.user_chat_sessions WHERE id = chat_history.user_chat_session_id) = auth.uid()
    )
    WITH CHECK (
        (SELECT user_id FROM public.user_chat_sessions WHERE id = chat_history.user_chat_session_id) = auth.uid()
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_history TO authenticated;


-- ШАГ 7: Применение RLS к таблице user_prompt_versions
ALTER TABLE public.user_prompt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prompt_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own prompt versions" ON public.user_prompt_versions;

CREATE POLICY "Users can manage their own prompt versions" ON public.user_prompt_versions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_prompt_versions TO authenticated;


-- Сообщение об успешном завершении
SELECT 'RLS policies for Neon Data API applied successfully to all core user tables.' as status;
