export const reserveLua = `
    local seatKey = KEYS[1]
    local userId = ARGV[1]
    if redis.call('EXISTS', seatKey) == 1 then
      return 0
    end
    redis.call('SET', seatKey, userId)
    return 1
`;
